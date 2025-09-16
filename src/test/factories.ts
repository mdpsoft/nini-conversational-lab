import type { RelationshipType } from '@/types/scenario-audit'

// Define UserAIProfile interface for testing
export interface UserAIProfile {
  id: string
  name: string
  personality: string
  behavior: string
  focus: string
  safety: string
  instructions: string
  createdAt: string
  updatedAt: string
}

// Factory helpers
export function makeProfile(overrides: Partial<UserAIProfile> = {}): UserAIProfile {
  return {
    id: `profile-${Math.random().toString(36).substring(7)}`,
    name: 'Test Profile',
    personality: 'friendly',
    behavior: 'helpful',
    focus: 'general',
    safety: 'standard',
    instructions: 'You are a helpful assistant',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeScenario(overrides: Partial<{
  id: string
  name: string
  description: string
  relationshipType: RelationshipType
  language: string
  crisisSignals: string
  goals: string[]
  seedTurns: Array<{ speaker: string; text: string }>
}> = {}) {
  return {
    id: `scenario-${Math.random().toString(36).substring(7)}`,
    name: 'Test Scenario',
    description: 'A test scenario for testing purposes',
    relationshipType: 'just_friend' as RelationshipType,
    language: 'en',
    crisisSignals: null,
    goals: ['Test goal 1', 'Test goal 2'],
    seedTurns: [
      { speaker: 'user', text: 'Hello!' },
      { speaker: 'ai', text: 'Hi there! How can I help you?' }
    ],
    ...overrides,
  }
}

export function makeRun(overrides: Partial<{
  id: string
  scenarioId: string
  profileId: string
  storyMode: boolean
  maxTurns: number
  status: string
  createdAt: string
  finishedAt?: string
}> = {}) {
  return {
    id: `run-${Math.random().toString(36).substring(7)}`,
    scenarioId: `scenario-${Math.random().toString(36).substring(7)}`,
    profileId: `profile-${Math.random().toString(36).substring(7)}`,
    storyMode: false,
    maxTurns: 10,
    status: 'running',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeTurn(overrides: Partial<{
  id: number
  runId: string
  turnIndex: number
  speaker: 'Nini' | 'USERAI'
  text: string
  beat?: any
  shortMemory?: any
  createdAt: string
}> = {}) {
  return {
    id: Math.floor(Math.random() * 1000000),
    runId: `run-${Math.random().toString(36).substring(7)}`,
    turnIndex: 1,
    speaker: 'USERAI' as const,
    text: 'Test message',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function makeEvent(overrides: Partial<{
  id: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  type: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH'
  traceId?: string
  runId?: string
  turnIndex?: number
  scenarioId?: string
  profileId?: string
  meta?: any
  state?: 'OPEN' | 'ACK' | 'RESOLVED'
  tags?: string[]
  createdAt: string
}> = {}) {
  return {
    id: `event-${Math.random().toString(36).substring(7)}`,
    level: 'INFO' as const,
    type: 'test_event',
    state: 'OPEN' as const,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// Batch factories for multiple items
export function makeProfiles(count: number, overrides: Partial<UserAIProfile> = {}): UserAIProfile[] {
  return Array.from({ length: count }, (_, index) => 
    makeProfile({ 
      name: `Test Profile ${index + 1}`,
      ...overrides 
    })
  )
}

export function makeScenarios(count: number, overrides: any = {}) {
  return Array.from({ length: count }, (_, index) => 
    makeScenario({ 
      name: `Test Scenario ${index + 1}`,
      ...overrides 
    })
  )
}

// Factory with realistic data
export function makeRealisticProfile(): UserAIProfile {
  const personalities = ['friendly', 'professional', 'casual', 'formal']
  const behaviors = ['helpful', 'creative', 'analytical', 'supportive']
  const focuses = ['general', 'technical', 'creative', 'educational']
  
  return makeProfile({
    personality: personalities[Math.floor(Math.random() * personalities.length)],
    behavior: behaviors[Math.floor(Math.random() * behaviors.length)],
    focus: focuses[Math.floor(Math.random() * focuses.length)],
    instructions: 'This is a realistic test profile with varied characteristics',
  })
}