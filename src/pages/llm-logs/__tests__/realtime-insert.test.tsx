import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '@/test/render'
import { emitRealtime } from '@/test/mocks/supabaseClient.mock'
import { makeEvent } from '@/test/factories'

// Mock LLM Logs Viewer component
const MockLLMLogsViewer = () => {
  const [events, setEvents] = React.useState<any[]>([])

  React.useEffect(() => {
    // Simulate Supabase realtime subscription
    const { supabase } = require('@/integrations/supabase/client')
    
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, (payload: any) => {
        setEvents(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      <h1>LLM Logs Viewer</h1>
      <div data-testid="events-list">
        {events.map((event, index) => (
          <div 
            key={event.id || index} 
            data-testid={`event-${index}`}
            className="fade-in opacity-100 transition-opacity duration-300"
          >
            <div>{event.type}</div>
            <div>{event.level}</div>
            <div>{event.created_at}</div>
          </div>
        ))}
      </div>
      {events.length === 0 && (
        <div data-testid="no-events">No events yet</div>
      )}
    </div>
  )
}

// Mock React for the component
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    default: actual
  }
})

// Import React after the mock
import React from 'react'

describe('LLM Logs Realtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display new event when realtime INSERT is emitted', async () => {
    renderWithProviders(<MockLLMLogsViewer />)

    // Initially no events
    expect(screen.getByTestId('no-events')).toBeInTheDocument()

    // Emit a new event
    const newEvent = makeEvent({
      id: 'event-123',
      type: 'llm_request',
      level: 'INFO',
      createdAt: new Date().toISOString()
    })

    emitRealtime({
      table: 'events',
      event: 'INSERT',
      newRow: newEvent
    })

    // Wait for the event to appear
    await waitFor(() => {
      expect(screen.getByTestId('event-0')).toBeInTheDocument()
    })

    // Check event content
    expect(screen.getByText('llm_request')).toBeInTheDocument()
    expect(screen.getByText('INFO')).toBeInTheDocument()
    expect(screen.queryByTestId('no-events')).not.toBeInTheDocument()
  })

  it('should add multiple events in sequence', async () => {
    renderWithProviders(<MockLLMLogsViewer />)

    // Emit first event
    emitRealtime({
      table: 'events',
      event: 'INSERT',
      newRow: makeEvent({ type: 'event_1', level: 'INFO' })
    })

    // Wait for first event
    await waitFor(() => {
      expect(screen.getByTestId('event-0')).toBeInTheDocument()
    })

    // Emit second event
    emitRealtime({
      table: 'events',
      event: 'INSERT',
      newRow: makeEvent({ type: 'event_2', level: 'WARN' })
    })

    // Wait for second event
    await waitFor(() => {
      expect(screen.getByTestId('event-1')).toBeInTheDocument()
    })

    // Both events should be present
    expect(screen.getByText('event_1')).toBeInTheDocument()
    expect(screen.getByText('event_2')).toBeInTheDocument()
    expect(screen.getByText('INFO')).toBeInTheDocument()
    expect(screen.getByText('WARN')).toBeInTheDocument()
  })

  it('should apply fade-in animation classes to new events', async () => {
    renderWithProviders(<MockLLMLogsViewer />)

    emitRealtime({
      table: 'events',
      event: 'INSERT',
      newRow: makeEvent({ type: 'animated_event' })
    })

    await waitFor(() => {
      const eventElement = screen.getByTestId('event-0')
      expect(eventElement).toHaveClass('fade-in', 'opacity-100', 'transition-opacity')
    })
  })

  it('should only react to events table inserts', async () => {
    renderWithProviders(<MockLLMLogsViewer />)

    // Emit event from different table - should not show
    emitRealtime({
      table: 'users',
      event: 'INSERT',
      newRow: { id: '1', name: 'Test User' }
    })

    // Should still show no events
    expect(screen.getByTestId('no-events')).toBeInTheDocument()

    // Emit UPDATE event - should not show  
    emitRealtime({
      table: 'events',
      event: 'UPDATE',
      newRow: makeEvent({ type: 'updated_event' })
    })

    // Should still show no events
    expect(screen.getByTestId('no-events')).toBeInTheDocument()

    // Only INSERT on events table should trigger
    emitRealtime({
      table: 'events',
      event: 'INSERT',
      newRow: makeEvent({ type: 'correct_event' })
    })

    await waitFor(() => {
      expect(screen.getByText('correct_event')).toBeInTheDocument()
    })
  })
})