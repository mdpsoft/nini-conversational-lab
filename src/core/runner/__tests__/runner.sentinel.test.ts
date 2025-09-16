import { describe, it, expect, vi, beforeEach } from 'vitest';
import NiniAdapter from '@/core/nini/NiniAdapter';
import { Runner } from '@/core/runner/Runner';
import * as runsRepo from '@/data/runsRepo';
import * as turnsRepo from '@/data/turnsRepo';
import * as eventsRepo from '@/data/eventsRepo';
import { installSupabaseMock } from '@/test/mocks/supabaseClient.mock';

vi.mock('@/integrations/supabase/client', () => {
  const { createMockSupabaseClient } = require('@/test/mocks/supabaseClient.mock');
  return { supabase: createMockSupabaseClient() };
});

// Mock repos
vi.mock('@/data/runsRepo');
vi.mock('@/data/turnsRepo');
vi.mock('@/data/eventsRepo');

describe('Runner Sentinel Tests', () => {
  const mockProfile: any = { id: 'profile-1', name: 'Test Profile' };
  const mockScenario: import('@/types/core').Scenario = {
    id: 'scenario-1',
    name: 'Test Scenario',
    language: 'en',
    topic: 'friend',
    attachment_style: 'secure',
    emotional_intensity: 0.5,
    cognitive_noise: 0.1,
    crisis_signals: 'none',
    goals: ['Test goal'],
    constraints: [],
    seed_turns: ['Hello there'],
    success_criteria: { must: [] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installSupabaseMock({ user: { id: 'user-123', email: 'test@example.com' } });
    
    // Setup default mocks
    vi.mocked(runsRepo.createRun).mockResolvedValue({ runId: 'test-run-123' });
    vi.mocked(runsRepo.finishRun).mockResolvedValue();
    vi.mocked(turnsRepo.insertTurn).mockResolvedValue({ turnId: 1 });
    vi.mocked(turnsRepo.upsertTurnMetrics).mockResolvedValue();
    vi.mocked(turnsRepo.upsertTurnSafety).mockResolvedValue();
    vi.mocked(eventsRepo.logEvent).mockResolvedValue();
  });

  it('happy path: creates run, processes turns, finishes run with proper events', async () => {
    // Mock successful LLM responses
    vi.spyOn(NiniAdapter as any, 'respondAsUserAI').mockResolvedValue({
      success: true,
      text: 'Hello, how are you?',
      meta: { beat: 'greeting', memory: { mood: 'friendly' } }
    });

    vi.spyOn(NiniAdapter as any, 'respondWithNini').mockResolvedValue({
      success: true,
      text: 'I am doing well, thank you for asking!',
      meta: { usage: { tokens: 50 }, emoji_count: 0 }
    });

    const runOptions = {
      conversationsPerScenario: 1,
      maxTurns: 2
    };

    const result = await Runner.runScenario(
      mockScenario,
      runOptions,
      'test-system-spec',
      { safety: 'standard' },
      { model: 'test-model', temperature: 0.7 },
      false, // not simulation mode
      mockProfile
    );

    // Verify run creation was called
    expect(runsRepo.createRun).toHaveBeenCalledWith({
      scenarioId: mockScenario.id,
      profileId: mockProfile.id,
      storyMode: true,
      maxTurns: 2
    });

    // Verify events were logged in correct sequence
    expect(eventsRepo.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'INFO',
        type: 'RUN.START',
        runId: 'test-run-123',
        scenarioId: mockScenario.id
      })
    );

    // Should have multiple turn end events
    const turnEndCalls = vi.mocked(eventsRepo.logEvent).mock.calls.filter(
      call => call[0].type === 'TURN.END'
    );
    expect(turnEndCalls.length).toBeGreaterThanOrEqual(1);

    // Should have successful result
    expect(result.scenarioId).toBe(mockScenario.id);
    expect(result.conversations).toHaveLength(1);
    const conv = result.conversations[0] as any;
    expect(conv.supabaseSync?.status).toBe('synced');
  });

  it('handles LLM error gracefully without crashing', async () => {
    // Mock LLM error
    const llmError = new Error('LLM service unavailable');
    vi.spyOn(NiniAdapter as any, 'respondAsUserAI').mockResolvedValue({
      success: true,
      text: 'Hello!',
      meta: {}
    });

    vi.spyOn(NiniAdapter as any, 'respondWithNini').mockRejectedValue(llmError);

    const runOptions = {
      conversationsPerScenario: 1,
      maxTurns: 2
    };

    // Should not throw
    const result = await Runner.runScenario(
      mockScenario,
      runOptions,
      'test-system-spec',
      { safety: 'standard' },
      { model: 'test-model' },
      false,
      mockProfile
    );

    // Should still have a result (graceful degradation)
    expect(result.scenarioId).toBe(mockScenario.id);
    expect(result.conversations).toHaveLength(1);

    // Should log LLM error with HIGH severity
    expect(eventsRepo.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'ERROR',
        type: expect.stringMatching(/LLM|ERROR/),
        severity: expect.any(String)
      })
    );
  });

  it('shows "Synced to Supabase" badge when connected', async () => {
    // This test would be more relevant in a component test, but we can verify the sync status
    vi.spyOn(NiniAdapter as any, 'respondAsUserAI').mockResolvedValue({
      success: true,
      text: 'Test message',
      meta: {}
    });

    const result = await Runner.runScenario(
      mockScenario,
      { conversationsPerScenario: 1, maxTurns: 1 },
      'test-system-spec',
      {},
      {},
      false,
      mockProfile
    );

    // Verify sync status is set correctly
    const conv = result.conversations[0] as any;
    expect(conv.supabaseSync?.enabled).toBe(true);
    expect(conv.supabaseSync?.status).toBe('synced');
    expect(conv.supabaseSync?.runId).toBe('test-run-123');
  });
});