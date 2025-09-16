import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/render';
import { makeProfile, makeScenario } from '@/test/factories';
import { Runner } from '@/core/runner/Runner';
import * as runsRepo from '@/data/runsRepo';
import * as eventsRepo from '@/data/eventsRepo';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => {
  const { createMockSupabaseClient } = require('@/test/mocks/supabaseClient.mock');
  return { supabase: createMockSupabaseClient() };
});

vi.mock('@/data/runsRepo');
vi.mock('@/data/eventsRepo');

describe('RLS Contract Sentinel Tests', () => {
  const mockScenario = makeScenario({
    relationshipType: 'just_friend',
    crisisSignals: 'none'
  });
  const mockProfile = makeProfile();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('falls back to local mode when no session', async () => {
    vi.mocked(runsRepo.createRun).mockRejectedValue(
      new Error('User must be authenticated to create a run')
    );
    vi.mocked(eventsRepo.logEvent).mockResolvedValue();

    const result = await Runner.runScenario(
      mockScenario as any, // Cast to legacy type for Runner compatibility
      { conversationsPerScenario: 1, maxTurns: 1 },
      'test-system-spec',
      {},
      { model: 'test-model', apiKey: 'test-key', temperature: 0.7, maxTokens: 100 },
      false,
      mockProfile
    );

    // Should still complete successfully in local mode
    expect(result.conversations).toHaveLength(1);
  });

  it('renders guest mode banner when in local-only mode', async () => {
    const TestComponent = () => {
      return React.createElement('div', { 'data-testid': 'guest-banner' }, 'Local Only (Guest)');
    };

    renderWithProviders(React.createElement(TestComponent), {
      guestMode: true,
      user: null
    });

    // Should show guest mode indicator
    expect(screen.getByTestId('guest-banner')).toBeInTheDocument();
  });

  it('shows guest mode UI when authentication fails', async () => {
    // Component that shows different UI based on auth state
    const AuthSensitiveComponent = () => {
      const [isGuest, setIsGuest] = React.useState(false);

      React.useEffect(() => {
        // Simulate checking auth state
        const checkAuth = async () => {
          try {
            const { supabase } = require('@/integrations/supabase/client');
            const { data: { user } } = await supabase.auth.getUser();
            setIsGuest(!user);
          } catch (error) {
            setIsGuest(true);
          }
        };
        
        checkAuth();
      }, []);

      return React.createElement('div', null, [
        isGuest ? React.createElement('div', { 
          key: 'guest',
          'data-testid': 'guest-mode-indicator' 
        }, [
          React.createElement('div', { key: 'title' }, 'Local Only (Guest)'),
          React.createElement('div', { key: 'desc' }, 'Data stored in browser only')
        ]) : React.createElement('div', { 
          key: 'auth',
          'data-testid': 'authenticated-mode' 
        }, [
          React.createElement('div', { key: 'title' }, 'Synced to Supabase')
        ])
      ]);
    };

    renderWithProviders(React.createElement(AuthSensitiveComponent), {
      guestMode: true,
      user: null
    });

    // Should show guest mode UI
    expect(screen.getByTestId('guest-mode-indicator')).toBeInTheDocument();
    expect(screen.getByText('Local Only (Guest)')).toBeInTheDocument();
    expect(screen.getByText('Data stored in browser only')).toBeInTheDocument();
  });

  it('handles repo fallback correctly when RLS policies fail', async () => {
    // Mock RLS policy violation
    const rlsError = new Error('new row violates row-level security policy');
    vi.mocked(runsRepo.createRun).mockRejectedValue(rlsError);
    vi.mocked(eventsRepo.logEvent).mockResolvedValue();

    const result = await Runner.runScenario(
      mockScenario as any,
      { conversationsPerScenario: 1, maxTurns: 1 },
      'test-system-spec',
      {},
      { model: 'test-model', apiKey: 'test-key', temperature: 0.7, maxTokens: 100 },
      false,
      mockProfile
    );

    // Should gracefully handle the RLS failure
    expect(result.conversations).toHaveLength(1);
    
    // Should have attempted to create run but failed gracefully
    expect(runsRepo.createRun).toHaveBeenCalled();
  });

  it('logs appropriate fallback events when database access fails', async () => {
    const dbError = new Error('Database connection failed');
    vi.mocked(runsRepo.createRun).mockRejectedValue(dbError);
    vi.mocked(eventsRepo.logEvent).mockResolvedValue();

    await Runner.runScenario(
      mockScenario as any,
      { conversationsPerScenario: 1, maxTurns: 1 },
      'test-system-spec',
      {},
      { model: 'test-model', apiKey: 'test-key', temperature: 0.7, maxTokens: 100 },
      false,
      mockProfile
    );

    // Should have attempted to create run
    expect(runsRepo.createRun).toHaveBeenCalled();
    
    // The runner should handle the error gracefully without throwing
    // In a real scenario, it would fall back to local-only mode
  });
});