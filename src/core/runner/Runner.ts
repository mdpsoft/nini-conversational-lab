import { Scenario, Conversation, RunOptions, RunSummary, RunResult, Turn } from '../../types/core';
import NiniAdapter from '../nini/NiniAdapter';
import { createUserAI } from '../userai/UserAI';
import { runAllLinters } from '../linters';
import { aggregateScores } from '../scoring/score';
import { generateId } from '../../utils/seeds';

export class Runner {
  static async runScenario(
    scenario: Scenario,
    options: RunOptions,
    xmlSystemSpec: string,
    knobsBase: any,
    niniOptions: any,
    simulationMode: boolean = false
  ): Promise<RunResult> {
    const conversations: Conversation[] = [];

    for (let i = 0; i < options.conversationsPerScenario; i++) {
      const conversation = await this.runSingleConversation(
        scenario,
        options,
        xmlSystemSpec,
        knobsBase,
        niniOptions,
        simulationMode,
        i // Use as seed
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
    seed: number
  ): Promise<Conversation> {
    const conversationId = generateId();
    const userAI = createUserAI(scenario, seed);
    
    const conversation: Conversation = {
      id: conversationId,
      scenarioId: scenario.id,
      knobs: knobsBase,
      turns: [],
      lints: [],
    };

    // Generate opening turn from UserAI
    let userTurn = userAI.generateNext();
    if (userTurn) {
      conversation.turns.push(userTurn);
    }

    // Main conversation loop
    for (let turnIndex = 0; turnIndex < options.maxTurns && userTurn; turnIndex++) {
      try {
        // Build language-enforced system prompt
        const languageGuardedSpec = this.addLanguageGuard(xmlSystemSpec, scenario, knobsBase);
        
        // Get Nini's response
        const niniResponse = await NiniAdapter.respondWithNini(
          languageGuardedSpec,
          conversation.turns,
          knobsBase,
          niniOptions,
          simulationMode
        );

        if (niniResponse.success) {
          const niniTurn: Turn = {
            agent: 'nini',
            text: niniResponse.text,
            meta: {
              chars: niniResponse.text.length,
              emoji_count: (niniResponse.meta as any)?.emoji_count || 0,
              crisis_active: (niniResponse.meta as any)?.crisis_active || false,
            },
          };
          conversation.turns.push(niniTurn);

          // Generate next user turn
          userTurn = userAI.generateNext(niniResponse.text);
          if (userTurn) {
            conversation.turns.push(userTurn);
          }
        } else {
          // Handle Nini error
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
        break;
      }
    }

    // Apply linters
    conversation.lints = runAllLinters(conversation.turns, xmlSystemSpec, scenario.language);
    
    // Calculate scores
    conversation.scores = aggregateScores(conversation.lints);

    return conversation;
  }
  
  private static addLanguageGuard(xmlSystemSpec: string, scenario: Scenario, knobs: any): string {
    const targetLocale = scenario.language;
    const strictness = knobs.language_strictness || 0.9;
    
    if (targetLocale === 'mix' || strictness < 0.5) {
      return xmlSystemSpec; // No language enforcement
    }
    
    const languageGuard = targetLocale === 'es'
      ? `You must respond **only in Spanish**. If the user writes in a different language, ask once: "¿Preferís que sigamos en ese idioma?" and wait for explicit confirmation before switching. Until confirmed, continue in Spanish. Never mix languages in the same message.`
      : `You must respond **only in English**. If the user writes in a different language, ask once: "Would you like to switch to that language?" and wait for explicit confirmation before switching. Until confirmed, continue in English. Never mix languages in the same message.`;
    
    // Insert language guard at the beginning for maximum priority
    return `Target locale: ${targetLocale}\n${languageGuard}\n\n${xmlSystemSpec}`;
  }
}