import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { installSupabaseMock, resetSupabaseMock, type MockSupabaseConfig } from './mocks/supabaseClient.mock'

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: {
    id: string
    email: string
  } | null
  guestMode?: boolean
  supabaseMock?: MockSupabaseConfig
  initialRoute?: string
}

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const {
    user = null,
    guestMode = false,
    supabaseMock = {},
    initialRoute = '/',
    ...renderOptions
  } = options

  // Reset and configure Supabase mock
  resetSupabaseMock()
  installSupabaseMock({
    user,
    session: user ? { user } : null,
    ...supabaseMock
  })

  // Mock guest mode
  if (guestMode !== undefined) {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => {
        if (key === 'guest_mode') return guestMode ? 'true' : 'false'
        return null
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  }

  // Set initial route
  if (initialRoute !== '/') {
    window.history.pushState({}, 'Test page', initialRoute)
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = createTestQueryClient()
    
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  const result = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  })

  return {
    ...result,
    user: userEvent.setup(),
  }
}

// Helper to create authenticated user for tests
export const createTestUser = (overrides: Partial<{ id: string; email: string }> = {}) => ({
  id: 'test-user-123',
  email: 'test@example.com',
  ...overrides,
})

// Helper to create guest mode setup
export const createGuestModeSetup = () => ({
  guestMode: true,
  user: null,
})