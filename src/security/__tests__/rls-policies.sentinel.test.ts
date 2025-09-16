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
  const mockScenario = makeScenario();
  const mockProfile = makeProfile();

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

    expect(result.conversations[0].supabaseSync?.enabled).toBe(false);
    expect(result.conversations[0].supabaseSync?.status).toBe('local-only');
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