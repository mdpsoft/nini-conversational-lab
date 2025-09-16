import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/render';
import { makeProfile, makeScenario } from '@/test/factories';
import { Runner } from '@/core/runner/Runner';
import * as runsRepo from '@/data/runsRepo';
import * as eventsRepo from '@/data/eventsRepo';
import React from 'react';

vi.mock('@/data/runsRepo');
vi.mock('@/data/eventsRepo');

describe('RLS Contract Sentinel Tests', () => {
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
  const mockProfile: any = { id: 'profile-1', name: 'Test Profile' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to local mode when no session', async () => {
    vi.mocked(runsRepo.createRun).mockRejectedValue(
      new Error('User must be authenticated to create a run')
    );
    vi.mocked(eventsRepo.logEvent).mockResolvedValue();

    const result = await Runner.runScenario(
      mockScenario,
      { conversationsPerScenario: 1, maxTurns: 1 },
      'test-system-spec',
      {},
      {},
      false,
      mockProfile
    );

    const conv = result.conversations[0] as any;
    expect(conv.supabaseSync?.enabled).toBe(false);
    expect(conv.supabaseSync?.status).toBe('local-only');
  });

  it('renders guest mode banner', async () => {
    const TestComponent = () => {
      return React.createElement('div', { 'data-testid': 'guest-banner' }, 'Local Only (Guest)');
    };

    renderWithProviders(React.createElement(TestComponent), {
      guestMode: true,
      user: null
    });

    expect(screen.getByTestId('guest-banner')).toBeInTheDocument();
  });
});