import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveProfilesRepo } from '@/data/useraiProfiles'

// Mock the guest mode hook
vi.mock('@/hooks/useGuestMode', () => ({
  isGuestModeEnabled: vi.fn()
}))

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}))

describe('resolveProfilesRepo', () => {
  const mockIsGuestModeEnabled = vi.mocked(require('@/hooks/useGuestMode').isGuestModeEnabled)
  const mockSupabase = vi.mocked(require('@/integrations/supabase/client').supabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return LocalProfilesRepo when in guest mode', () => {
    mockIsGuestModeEnabled.mockReturnValue(true)
    
    const repo = resolveProfilesRepo()
    
    expect(repo.constructor.name).toBe('LocalProfilesRepo')
    expect(mockIsGuestModeEnabled).toHaveBeenCalled()
  })

  it('should return SupabaseProfilesRepo when not in guest mode and has session', () => {
    mockIsGuestModeEnabled.mockReturnValue(false)
    
    // Mock localStorage to simulate having a session
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('{"access_token":"mock-token"}'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
    
    const repo = resolveProfilesRepo()
    
    expect(repo.constructor.name).toBe('SupabaseProfilesRepo')
    expect(mockIsGuestModeEnabled).toHaveBeenCalled()
  })

  it('should return LocalProfilesRepo when not in guest mode but no session', () => {
    mockIsGuestModeEnabled.mockReturnValue(false)
    
    // Mock localStorage to simulate no session
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
    
    const repo = resolveProfilesRepo()
    
    expect(repo.constructor.name).toBe('LocalProfilesRepo')
  })

  it('should handle localStorage errors gracefully', () => {
    mockIsGuestModeEnabled.mockReturnValue(false)
    
    // Mock localStorage to throw error
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error('localStorage not available')
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
    
    const repo = resolveProfilesRepo()
    
    // Should fallback to LocalProfilesRepo when localStorage fails
    expect(repo.constructor.name).toBe('LocalProfilesRepo')
  })
})