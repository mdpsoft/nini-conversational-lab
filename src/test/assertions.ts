import { expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

/**
 * Assert that a toast message is displayed
 * @param messageSubstring - Substring to look for in the toast message
 */
export const expectToast = async (messageSubstring: string) => {
  await waitFor(() => {
    const toastElement = screen.getByRole('status', { 
      name: new RegExp(messageSubstring, 'i') 
    }) || screen.getByText(new RegExp(messageSubstring, 'i'))
    expect(toastElement).toBeInTheDocument()
  }, { timeout: 3000 })
}

/**
 * Assert that no toast with the given message is displayed
 * @param messageSubstring - Substring to check absence of
 */
export const expectNoToast = (messageSubstring: string) => {
  const toastElement = screen.queryByText(new RegExp(messageSubstring, 'i'))
  expect(toastElement).not.toBeInTheDocument()
}

/**
 * Assert that an event was logged with the given type
 * @param eventType - The event type to check for
 */
export const expectEventLogged = (eventType: string) => {
  // This requires mocking the eventsRepo.logEvent function in the test
  const logEventSpy = vi.mocked(require('@/data/eventsRepo').logEvent)
  expect(logEventSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      type: eventType
    })
  )
}

/**
 * Assert that an element appears with a fade-in animation
 * @param element - The element to check
 */
export const expectFadeIn = async (element: HTMLElement) => {
  // Check for common fade-in class names or styles
  await waitFor(() => {
    expect(element).toHaveClass(/fade-in|animate-fade-in|opacity-100/)
  })
}

/**
 * Assert that a loading state is displayed
 */
export const expectLoading = () => {
  const loadingElement = screen.getByTestId('loading') || 
                         screen.getByText(/loading/i) ||
                         screen.getByRole('progressbar')
  expect(loadingElement).toBeInTheDocument()
}

/**
 * Assert that no loading state is displayed
 */
export const expectNotLoading = () => {
  const loadingElement = screen.queryByTestId('loading') || 
                        screen.queryByText(/loading/i) ||
                        screen.queryByRole('progressbar')
  expect(loadingElement).not.toBeInTheDocument()
}

/**
 * Assert that an error message is displayed
 * @param errorMessage - The error message to look for
 */
export const expectError = async (errorMessage: string) => {
  await waitFor(() => {
    const errorElement = screen.getByRole('alert') || 
                        screen.getByText(new RegExp(errorMessage, 'i'))
    expect(errorElement).toBeInTheDocument()
  })
}

/**
 * Assert that a form field has validation error
 * @param fieldName - The field name or label
 * @param errorMessage - The expected error message
 */
export const expectFieldError = async (fieldName: string, errorMessage: string) => {
  const field = screen.getByLabelText(new RegExp(fieldName, 'i'))
  expect(field).toBeInvalid()
  
  await waitFor(() => {
    const errorElement = screen.getByText(new RegExp(errorMessage, 'i'))
    expect(errorElement).toBeInTheDocument()
  })
}

/**
 * Assert that Supabase auth method was called
 * @param method - The auth method name
 * @param args - Expected arguments
 */
export const expectSupabaseAuthCalled = (method: string, ...args: any[]) => {
  const supabase = require('@/integrations/supabase/client').supabase
  expect(supabase.auth[method]).toHaveBeenCalledWith(...args)
}

/**
 * Assert that a database query was called
 * @param table - The table name
 * @param method - The query method (select, insert, etc.)
 */
export const expectDatabaseQuery = (table: string, method: string) => {
  const supabase = require('@/integrations/supabase/client').supabase
  expect(supabase.from).toHaveBeenCalledWith(table)
  // Note: More specific assertions would depend on how the mock is set up
}