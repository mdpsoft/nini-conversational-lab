import { vi } from 'vitest'

export interface MockSupabaseConfig {
  user?: {
    id: string
    email: string
  } | null
  session?: {
    user: {
      id: string
      email: string
    }
  } | null
  authError?: Error | null
  dbResponses?: Record<string, any>
}

// Mock Supabase client with configurable responses
let mockConfig: MockSupabaseConfig = {}

// Realtime events emitter for testing
const realtimeChannels = new Map<string, any>()

export const installSupabaseMock = (config: MockSupabaseConfig = {}) => {
  mockConfig = { ...mockConfig, ...config }
}

export const emitRealtime = (params: {
  channel?: string
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  newRow?: any
  oldRow?: any
}) => {
  const channelName = params.channel || 'schema-db-changes'
  const channel = realtimeChannels.get(channelName)
  
  if (channel && channel.callbacks) {
    channel.callbacks.forEach((callback: any) => {
      if (callback.config.table === params.table && callback.config.event === params.event) {
        callback.handler({
          eventType: params.event,
          new: params.newRow,
          old: params.oldRow,
          table: params.table,
        })
      }
    })
  }
}

// Mock Supabase client
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockConfig.user },
      error: mockConfig.authError
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: mockConfig.session },
      error: mockConfig.authError
    }),
    signInWithOtp: vi.fn().mockResolvedValue({
      data: {},
      error: mockConfig.authError
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockConfig.user, session: mockConfig.session },
      error: mockConfig.authError
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: mockConfig.user, session: mockConfig.session },
      error: mockConfig.authError
    }),
    signOut: vi.fn().mockResolvedValue({
      error: mockConfig.authError
    }),
    onAuthStateChange: vi.fn().mockImplementation((callback) => {
      // Immediately call with current state
      callback('SIGNED_IN', mockConfig.session)
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }
    })
  },
  
  from: vi.fn().mockImplementation((table: string) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const response = mockConfig.dbResponses?.[table]
      return Promise.resolve({
        data: Array.isArray(response) ? response[0] : response,
        error: null
      })
    }),
    then: vi.fn().mockImplementation((resolve) => {
      const response = mockConfig.dbResponses?.[table] || []
      resolve({
        data: response,
        error: null
      })
    })
  })),
  
  channel: vi.fn().mockImplementation((channelName: string) => {
    const channel = {
      callbacks: [] as any[],
      on: vi.fn().mockImplementation((type: string, config: any, handler?: any) => {
        if (type === 'postgres_changes') {
          channel.callbacks.push({ config, handler })
        } else if (type === 'presence') {
          // Handle presence events
          channel.callbacks.push({ config: { event: config.event }, handler })
        }
        return channel
      }),
      subscribe: vi.fn().mockImplementation(() => {
        realtimeChannels.set(channelName, channel)
        return Promise.resolve('SUBSCRIBED')
      }),
      unsubscribe: vi.fn().mockImplementation(() => {
        realtimeChannels.delete(channelName)
        return Promise.resolve('CLOSED')
      }),
      track: vi.fn().mockResolvedValue('ok'),
      presenceState: vi.fn().mockReturnValue({}),
    }
    return channel
  }),
  
  removeChannel: vi.fn(),
  
  storage: {
    from: vi.fn().mockImplementation(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/file.jpg' } 
      })
    }))
  }
})

// Reset mock state
export const resetSupabaseMock = () => {
  mockConfig = {}
  realtimeChannels.clear()
}