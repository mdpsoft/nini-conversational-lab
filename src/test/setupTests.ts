import '@testing-library/jest-dom'
import 'whatwg-fetch'
import { vi, beforeEach, beforeAll, afterAll } from 'vitest'

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// Mock console.error for controlled test scenarios (only for expected errors)
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Expected WebSocket connection'))
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
})

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})