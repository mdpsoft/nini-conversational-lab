import { Scenario, Conversation, RunOptions, RunSummary, RunResult, Turn } from '../../types/core';
import NiniAdapter from '../nini/NiniAdapter';
import { createUserAI } from '../userai/UserAI';
import { runAllLinters } from '../linters';
import { aggregateScores } from '../scoring/score';
import { generateId } from '../../utils/seeds';
import { buildSystemPrompt } from '../nini/prompt';
import { summarizeConversationMD } from '../nini/summarize';
import { postProcessUserAIResponse } from '../userai/responsePostProcessor';
import { applySafety } from '../safety/safetyHook';
import { computeTurnMetrics, aggregateRunMetrics } from '../metrics/turnMetrics';
import { createRun, finishRun } from '../../data/runsRepo';
import { insertTurn, upsertTurnMetrics, upsertTurnSafety } from '../../data/turnsRepo';
import { logEvent } from '../../data/eventsRepo';
import { supabase } from '@/integrations/supabase/client';

export class Runner {
  private static readonly BENCHMARKS = {
    total: 90,
    safety: 95,
    structural: 90,
    qualitative: 80,
  };

  static async runScenario(
    scenario: Scenario,
    options: RunOptions,
    xmlSystemSpec: string,
    knobsBase: any,
    niniOptions: any,
    simulationMode: boolean = false,
    userAIProfile?: any
  ): Promise<RunResult> {
    const conversations: Conversation[] = [];
    const startTime = Date.now();

    for (let i = 0; i < options.conversationsPerScenario; i++) {
      const conversation = await this.runSingleConversation(
        scenario,
        options,
        xmlSystemSpec,
        knobsBase,
        niniOptions,
        simulationMode,
        i, // Use as seed
        userAIProfile
      );
      conversations.push(conversation);
    }

    return {
      scenarioId: scenario.id,
      conversations,
    };
  }

  private static async runSingleConversation(
    scenario: Scenario,
    options: RunOptions,
    xmlSystemSpec: string,
    knobsBase: any,
    niniOptions: any,
    simulationMode: boolean,
    seed: number,
    userAIProfile?: any
  ): Promise<Conversation> {
    const conversationId = generateId();
    const userAI = createUserAI(scenario, seed, userAIProfile, options.maxTurns);
    const startTime = Date.now();
    
    let runId: string | null = null;
    let isSupabaseConnected = false;

    // Check if user is authenticated for Supabase persistence
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !simulationMode) {
        const { runId: createdRunId } = await createRun({
          scenarioId: scenario.id,
          profileId: userAIProfile?.id || null,
          storyMode: true, // Default to story mode
          maxTurns: options.maxTurns,
        });
        runId = createdRunId;
        isSupabaseConnected = true;

        // Log run start
        await logEvent({
          level: "INFO",
          type: "RUN.START",
          runId,
          scenarioId: scenario.id,
          profileId: userAIProfile?.id || null,
          meta: { 
            maxTurns: options.maxTurns, 
            storyMode: true, // Default to story mode
            conversationsPerScenario: options.conversationsPerScenario
          }
        });
      }
    } catch (error) {
      console.warn('Failed to create run in Supabase:', error);
      isSupabaseConnected = false;
    }
    
    const conversation: Conversation = {
      id: conversationId,
      scenarioId: scenario.id,
      knobs: knobsBase,
      turns: [],
      lints: [],
    };

    // Add sync status metadata
    (conversation as any).supabaseSync = {
      enabled: isSupabaseConnected,
      runId: runId,
      status: isSupabaseConnected ? 'synced' : 'local-only'
    };

    // Generate opening turn from UserAI
    let userTurn: Turn | null = null;
    let currentTurnIndex = 0;
    
    if (userAIProfile) {
      // Use runtime prompt for USERAI-driven conversation
      const userAIResponse = await NiniAdapter.respondAsUserAI(
        userAI,
        knobsBase,
        niniOptions,
        simulationMode
      );
      
      if (userAIResponse.success) {
        userTurn = {
          agent: 'user',
          text: userAIResponse.text,
          meta: userAIResponse.meta
        };
        conversation.turns.push(userTurn);
        
        // Persist initial USERAI turn
        if (isSupabaseConnected && runId) {
          try {
            const { turnId } = await insertTurn({
              runId,
              turnIndex: currentTurnIndex,
              speaker: "USERAI",
              text: userTurn.text,
              beat: userTurn.meta?.beat,
              shortMemory: userTurn.meta?.memory,
            });

            // Log turn completion
            await logEvent({
              level: "INFO",
              type: "TURN.END",
              runId,
              turnIndex: currentTurnIndex,
              meta: { speaker: "USERAI", initialTurn: true }
            });
          } catch (error) {
            console.warn('Failed to persist initial USERAI turn:', error);
            await logEvent({
              level: "ERROR",
              type: "DB.ERROR",
              runId,
              meta: { operation: "insertTurn", error: error.message }
            });
          }
        }
        
        // Store runtime debug info in conversation metadata
        if (userAIResponse.meta?.runtime_debug) {
          (conversation as any).runtime_debug = userAIResponse.meta.runtime_debug;
        }
      }
    } else {
      // Fallback to scenario-driven conversation
      userTurn = userAI.generateNext();
      if (userTurn) {
        conversation.turns.push(userTurn);
        
        // Persist initial scenario-driven turn
        if (isSupabaseConnected && runId) {
          try {
            const { turnId } = await insertTurn({
              runId,
              turnIndex: currentTurnIndex,
              speaker: "USERAI",
              text: userTurn.text,
              beat: userTurn.meta?.beat,
              shortMemory: userTurn.meta?.memory,
            });

            await logEvent({
              level: "INFO",
              type: "TURN.END",
              runId,
              turnIndex: currentTurnIndex,
              meta: { speaker: "USERAI", scenarioDriven: true }
            });
          } catch (error) {
            console.warn('Failed to persist initial scenario turn:', error);
          }
        }
      }
    }

    currentTurnIndex++;

    // Main conversation loop
    let crisisActiveAtAnyPoint = false;
    for (let loopTurnIndex = 0; loopTurnIndex < options.maxTurns && userTurn; loopTurnIndex++) {
      try {
        // Build system prompt with runtime guards
        const locale = scenario.language === 'mix' ? 'es' : scenario.language;
        const systemPrompt = buildSystemPrompt({
          xmlSystemSpec,
          knobs: knobsBase,
          locale,
        });
        
        // Log LLM request
        if (isSupabaseConnected && runId) {
          await logEvent({
            level: "DEBUG",
            type: "LLM.REQUEST",
            runId,
            turnIndex: currentTurnIndex,
            tags: ["LLM"],
            meta: { 
              model: niniOptions.model,
              temperature: niniOptions.temperature,
              maxTokens: niniOptions.maxTokens
            }
          });
        }

        const requestStart = Date.now();
        
        // Get Nini's response
        const niniResponse = await NiniAdapter.respondWithNini(
          systemPrompt,
          conversation.turns,
          knobsBase,
          niniOptions,
          simulationMode
        );

        const requestLatency = Date.now() - requestStart;

        if (niniResponse.success) {
          // Log successful LLM response
          if (isSupabaseConnected && runId) {
            await logEvent({
              level: "DEBUG",
              type: "LLM.RESPONSE",
              runId,
              turnIndex: currentTurnIndex,
              meta: { 
                usage: niniResponse.meta?.usage,
                latencyMs: requestLatency
              }
            });
          }

          // Apply safety hook to Nini response
          const safetyResult = applySafety(niniResponse.text, {
            speaker: 'Nini',
            lang: locale as 'es' | 'en',
            globalSafety: knobsBase.safety
          });

          // Log safety escalation if needed
          if (isSupabaseConnected && runId && safetyResult.flags?.escalated) {
            await logEvent({
              level: "WARN",
              type: "SAFETY.ESCALATE",
              runId,
              turnIndex: currentTurnIndex,
              tags: ["SAFETY"],
              meta: { 
                matched: safetyResult.flags.matched,
                escalation: true
              }
            });
          }

          // Compute turn metrics
          const turnMetrics = computeTurnMetrics(safetyResult.text, 'Nini', locale as 'es' | 'en');

          const niniTurn: Turn = {
            agent: 'nini',
            text: safetyResult.text,
            meta: {
              chars: safetyResult.text.length,
              emoji_count: (niniResponse.meta as any)?.emoji_count || 0,
              crisis_active: (niniResponse.meta as any)?.crisis_active || false,
              safety: safetyResult.flags,
              metrics: turnMetrics,
            },
          };

          // Track crisis
          if (niniTurn.meta?.crisis_active) {
            crisisActiveAtAnyPoint = true;
          }

          conversation.turns.push(niniTurn);

          // Persist Nini turn
          if (isSupabaseConnected && runId) {
            try {
              const { turnId } = await insertTurn({
                runId,
                turnIndex: currentTurnIndex,
                speaker: "Nini",
                text: niniTurn.text,
                beat: niniTurn.meta?.beat,
                shortMemory: niniTurn.meta?.memory,
              });

              // Persist turn metrics
              if (turnMetrics) {
                await upsertTurnMetrics(turnId, {
                  chars: turnMetrics.chars,
                  paragraphs: turnMetrics.paragraphs,
                  questions: turnMetrics.questions,
                  emotions: turnMetrics.emotions,
                  needs: turnMetrics.needs,
                  boundaries: turnMetrics.boundaries,
                });
              }

              // Persist turn safety
              if (safetyResult.flags) {
                await upsertTurnSafety(turnId, {
                  matched: safetyResult.flags.matched,
                  escalated: safetyResult.flags.escalated,
                });
              }

              // Log turn completion
              await logEvent({
                level: "INFO",
                type: "TURN.END",
                runId,
                turnIndex: currentTurnIndex,
                meta: { 
                  speaker: "Nini",
                  metrics: {
                    chars: turnMetrics.chars,
                    questions: turnMetrics.questions,
                  },
                  safety: safetyResult.flags,
                  beat: niniTurn.meta?.beat
                }
              });
            } catch (error) {
              console.warn('Failed to persist Nini turn:', error);
              await logEvent({
                level: "ERROR",
                type: "DB.ERROR",
                runId,
                meta: { operation: "persistNiniTurn", error: error.message }
              });
            }
          }

          currentTurnIndex++;

          // Generate next user turn
          if (userAIProfile) {
            // Use runtime prompt for USERAI response
            const userAIResponse = await NiniAdapter.respondAsUserAI(
              userAI,
              knobsBase,
              niniOptions,
              simulationMode
            );
            
            if (userAIResponse.success) {
              // Apply post-processing to USERAI response
              const isFinalTurn = loopTurnIndex >= options.maxTurns - 1;
              const lang = scenario.language === 'mix' ? 'es' : scenario.language;
              
              const postProcessed = postProcessUserAIResponse(userAIResponse.text, {
                isFinalTurn,
                questionRate: userAIProfile?.question_rate || { min: 0, max: 3 },
                lang: lang as 'es' | 'en',
                useSoftClosure: false,
              });

              // Apply safety hook to USERAI response
              const safetyResult = applySafety(postProcessed.text, {
                speaker: 'USERAI',
                lang: lang as 'es' | 'en',
                profile: userAIProfile,
                globalSafety: knobsBase.safety
              });

              // Compute turn metrics
              const turnMetrics = computeTurnMetrics(safetyResult.text, 'USERAI', lang as 'es' | 'en');

              // Log post-processing events
              if (isSupabaseConnected && runId) {
                if (postProcessed.meta?.earlyClosureDetected) {
                  await logEvent({
                    level: "INFO",
                    type: "SANITIZE.CLOSURE",
                    runId,
                    turnIndex: currentTurnIndex,
                    tags: ["SANITIZE"],
                    meta: { 
                      detected: true,
                      strategy: postProcessed.meta.strategy
                    }
                  });
                }

                if (postProcessed.meta?.questionCountBefore !== postProcessed.meta?.questionCountAfter) {
                  await logEvent({
                    level: "INFO",
                    type: "Q_RATE.ENFORCED",
                    runId,
                    turnIndex: currentTurnIndex,
                    meta: { 
                      before: postProcessed.meta.questionCountBefore,
                      after: postProcessed.meta.questionCountAfter,
                      expected: userAIProfile?.question_rate
                    }
                  });
                }

                // Log safety escalation if needed
                if (safetyResult.flags?.escalated) {
                  await logEvent({
                    level: "WARN",
                    type: "SAFETY.ESCALATE",
                    runId,
                    turnIndex: currentTurnIndex,
                    tags: ["SAFETY"],
                    meta: { 
                      matched: safetyResult.flags.matched,
                      escalation: true
                    }
                  });
                }
              }

              userTurn = {
                agent: 'user',
                text: safetyResult.text,
                meta: {
                  ...userAIResponse.meta,
                  postProcess: postProcessed.meta,
                  safety: safetyResult.flags,
                  metrics: turnMetrics,
                }
              };
              conversation.turns.push(userTurn);

              // Persist USERAI turn
              if (isSupabaseConnected && runId) {
                try {
                  const { turnId } = await insertTurn({
                    runId,
                    turnIndex: currentTurnIndex,
                    speaker: "USERAI",
                    text: userTurn.text,
                    beat: userTurn.meta?.beat,
                    shortMemory: userTurn.meta?.memory,
                  });

                  // Persist turn metrics
                  if (turnMetrics) {
                    await upsertTurnMetrics(turnId, {
                      chars: turnMetrics.chars,
                      paragraphs: turnMetrics.paragraphs,
                      questions: turnMetrics.questions,
                      emotions: turnMetrics.emotions,
                      needs: turnMetrics.needs,
                      boundaries: turnMetrics.boundaries,
                    });
                  }

                  // Persist turn safety
                  if (safetyResult.flags) {
                    await upsertTurnSafety(turnId, {
                      matched: safetyResult.flags.matched,
                      escalated: safetyResult.flags.escalated,
                    });
                  }

                  // Log turn completion
                  await logEvent({
                    level: "INFO",
                    type: "TURN.END",
                    runId,
                    turnIndex: currentTurnIndex,
                    meta: { 
                      speaker: "USERAI",
                      metrics: {
                        chars: turnMetrics.chars,
                        questions: turnMetrics.questions,
                      },
                      safety: safetyResult.flags,
                      postProcess: postProcessed.meta
                    }
                  });
                } catch (error) {
                  console.warn('Failed to persist USERAI turn:', error);
                  await logEvent({
                    level: "ERROR",
                    type: "DB.ERROR",
                    runId,
                    meta: { operation: "persistUSERAITurn", error: error.message }
                  });
                }
              }

              currentTurnIndex++;
              
              // Store runtime debug info in conversation metadata
              if (userAIResponse.meta?.runtime_debug) {
                (conversation as any).runtime_debug = userAIResponse.meta.runtime_debug;
              }
            } else {
              userTurn = null; // End conversation on USERAI error
              
              // Log USERAI error
              if (isSupabaseConnected && runId) {
                await logEvent({
                  level: "ERROR",
                  type: "LLM.ERROR",
                  runId,
                  turnIndex: currentTurnIndex,
                  severity: "HIGH",
                  tags: ["LLM"],
                  meta: { 
                    operation: "respondAsUserAI",
                    error: "USERAI response failed"
                  }
                });
              }
            }
          } else {
            // Fallback to scenario-driven generation
            userTurn = userAI.generateNext(niniResponse.text);
            if (userTurn) {
              conversation.turns.push(userTurn);
              
              // Persist scenario-driven turn
              if (isSupabaseConnected && runId) {
                try {
                  const { turnId } = await insertTurn({
                    runId,
                    turnIndex: currentTurnIndex,
                    speaker: "USERAI",
                    text: userTurn.text,
                    beat: userTurn.meta?.beat,
                    shortMemory: userTurn.meta?.memory,
                  });

                  await logEvent({
                    level: "INFO",
                    type: "TURN.END",
                    runId,
                    turnIndex: currentTurnIndex,
                    meta: { speaker: "USERAI", scenarioDriven: true }
                  });
                } catch (error) {
                  console.warn('Failed to persist scenario-driven turn:', error);
                }
              }
              
              currentTurnIndex++;
            }
          }
        } else {
          // Handle Nini error
          if (isSupabaseConnected && runId) {
            await logEvent({
              level: "ERROR",
              type: "LLM.ERROR",
              runId,
              turnIndex: currentTurnIndex,
              severity: "HIGH",
              tags: ["LLM"],
              meta: { 
                operation: "respondWithNini",
                error: "Nini response failed",
                latencyMs: requestLatency
              }
            });
          }
          
          const errorTurn: Turn = {
            agent: 'nini',
            text: '<<OpenAI error>>',
            meta: {
              rule_violations: ['OPENAI_ERROR'],
            },
          };
          conversation.turns.push(errorTurn);
          break;
        }
      } catch (error) {
        console.error('Error in conversation turn:', error);
        
        // Log unexpected error
        if (isSupabaseConnected && runId) {
          await logEvent({
            level: "ERROR",
            type: "RUN.ERROR",
            runId,
            turnIndex: currentTurnIndex,
            severity: "HIGH",
            meta: { 
              error: error.message,
              stack: error.stack?.substring(0, 500) // Truncate stack trace
            }
          });
        }
        break;
      }
    }

    // Apply linters
    conversation.lints = runAllLinters(conversation.turns, xmlSystemSpec, scenario.language);
    
    // Calculate scores
    conversation.scores = aggregateScores(conversation.lints);

    // Aggregate run metrics
    const runMetrics = aggregateRunMetrics(conversation.turns);
    (conversation as any).runMetrics = runMetrics;

    // Generate summary
    const locale = scenario.language === 'mix' ? 'es' : scenario.language;
    const summaryMD = summarizeConversationMD({
      locale,
      convoId: conversation.id,
      scores: conversation.scores,
      turns: conversation.turns,
      lints: conversation.lints,
      benchmarks: this.BENCHMARKS,
      knobsSnapshot: knobsBase,
      crisisActiveAtAnyPoint,
    });

    (conversation as any).summaryMD = summaryMD;

    // Finish run and log completion
    if (isSupabaseConnected && runId) {
      try {
        await finishRun(runId);
        
        const totalDuration = Date.now() - startTime;
        await logEvent({
          level: "INFO",
          type: "RUN.END",
          runId,
          meta: { 
            totalTurns: conversation.turns.length,
            durationMs: totalDuration,
            scores: conversation.scores,
            crisisActiveAtAnyPoint
          }
        });
      } catch (error) {
        console.warn('Failed to finish run:', error);
        await logEvent({
          level: "ERROR",
          type: "DB.ERROR",
          runId,
          meta: { operation: "finishRun", error: error.message }
        });
      }
    }

    return conversation;
  }
}