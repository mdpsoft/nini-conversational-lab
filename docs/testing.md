# Testing Documentation

This project uses Vitest with React Testing Library for comprehensive testing.

## Running Tests

```bash
# Run tests once with coverage
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI (if vitest UI is installed)
npm run test:ui
```

## Test Structure

- **Unit tests**: `src/**/__tests__/*.test.ts(x)`
- **Test utilities**: `src/test/`
- **Fixtures**: `src/test/fixtures/`

## Mocking Supabase

Use the built-in Supabase mock system:

```typescript
import { installSupabaseMock, emitRealtime } from '@/test/mocks/supabaseClient.mock'
import { renderWithProviders } from '@/test/render'

test('realtime functionality', async () => {
  installSupabaseMock({
    user: { id: 'test-user', email: 'test@example.com' }
  })
  
  renderWithProviders(<MyComponent />)
  
  // Emit realtime event
  emitRealtime({
    table: 'events',
    event: 'INSERT',
    newRow: { id: '1', type: 'test' }
  })
})
```

## Factories and Fixtures

Use factories to create test data:

```typescript
import { makeProfile, makeScenario, makeEvent } from '@/test/factories'

const profile = makeProfile({ name: 'Custom Name' })
const scenario = makeScenario({ relationshipType: 'coworker' })
```

## Rendering Components

Use `renderWithProviders` for consistent component testing:

```typescript
import { renderWithProviders, screen } from '@/test/render'

test('component renders', () => {
  renderWithProviders(<MyComponent />, {
    user: { id: 'test', email: 'test@example.com' },
    guestMode: false
  })
  
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

## Assertions

Use custom assertion helpers:

```typescript
import { expectToast, expectEventLogged, expectFadeIn } from '@/test/assertions'

// Check for toast messages
await expectToast('Success message')

// Check event logging
expectEventLogged('user_action')

// Check animations
await expectFadeIn(element)
```

## Best Practices

1. Use descriptive test names
2. Test user interactions, not implementation details  
3. Mock external dependencies
4. Use factories for test data
5. Clean up after tests (handled automatically)
6. Test both success and error scenarios