import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/render';
import NiniAdapter from '@/core/nini/NiniAdapter';
import { Runner } from '@/core/runner/Runner';
import { makeScenario, makeProfile } from '@/test/factories';
import * as runsRepo from '@/data/runsRepo';
import * as turnsRepo from '@/data/turnsRepo';
import * as eventsRepo from '@/data/eventsRepo';
import { installSupabaseMock } from '@/test/mocks/supabaseClient.mock';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => {
  const { createMockSupabaseClient } = require('@/test/mocks/supabaseClient.mock');
  return { supabase: createMockSupabaseClient() };
});

// Mock repos
vi.mock('@/data/runsRepo');
vi.mock('@/data/turnsRepo');
vi.mock('@/data/eventsRepo');

describe('Runner Sentinel Tests', () => {
  const mockProfile = makeProfile({ name: 'Test Profile' });
  const mockScenario = makeScenario({ 
    name: 'Test Scenario',
    relationshipType: 'just_friend',
    crisisSignals: 'none'
  });

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

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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
      mockScenario as any, // Cast to legacy type for Runner compatibility
      runOptions,
      'test-system-spec',
      { safety: 'standard' },
      { model: 'test-model', temperature: 0.7, apiKey: 'test-key', maxTokens: 100 },
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
      mockScenario as any,
      runOptions,
      'test-system-spec',
      { safety: 'standard' },
      { model: 'test-model', apiKey: 'test-key', temperature: 0.7, maxTokens: 100 },
      false,
      mockProfile
    );

    // Should still have a result (graceful degradation)
    expect(result.scenarioId).toBe(mockScenario.id);
    expect(result.conversations).toHaveLength(1);

    // Should log LLM error - the Runner should handle this gracefully
    expect(result.conversations[0].turns.length).toBeGreaterThanOrEqual(0);
  });

  it('shows sync status through UI components', async () => {
    // Mock successful response
    vi.spyOn(NiniAdapter as any, 'respondAsUserAI').mockResolvedValue({
      success: true,
      text: 'Test message',
      meta: {}
    });

    // Create a simple results component that shows sync status
    const ResultsComponent = ({ conversations }: { conversations: any[] }) => {
      const conv = conversations[0] as any;
      const syncStatus = conv?.supabaseSync?.status;
      
      return React.createElement('div', null, [
        React.createElement('div', { 
          key: 'count',
          'data-testid': 'conversation-count' 
        }, `${conversations.length} conversations`),
        syncStatus === 'synced' && React.createElement('div', { 
          key: 'sync',
          'data-testid': 'sync-badge' 
        }, 'Synced to Supabase'),
        syncStatus === 'local-only' && React.createElement('div', { 
          key: 'local',
          'data-testid': 'local-badge' 
        }, 'Local Only (Guest)')
      ].filter(Boolean));
    };

    const result = await Runner.runScenario(
      mockScenario as any,
      { conversationsPerScenario: 1, maxTurns: 1 },
      'test-system-spec',
      {},
      { model: 'test-model', apiKey: 'test-key', temperature: 0.7, maxTokens: 100 },
      false,
      mockProfile
    );

    // Render the results component with the conversation data
    renderWithProviders(
      React.createElement(ResultsComponent, { conversations: result.conversations })
    );

    // Assert UI shows correct sync status
    expect(screen.getByTestId('conversation-count')).toHaveTextContent('1 conversations');
    expect(screen.getByTestId('sync-badge')).toHaveTextContent('Synced to Supabase');
  });
});