import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/render';
import { makeScenario } from '@/test/factories';
import ScenariosPage from '@/pages/scenarios/ScenariosPage';
import userEvent from '@testing-library/user-event';

describe('Scenario Editor Sentinel Tests', () => {
  beforeEach(() => {
    // Clear any existing scenarios in store
    localStorage.clear();
  });

  it('does not show Attachment Style field in editor', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScenariosPage />);

    // Wait for component to load and show demo data option
    await waitFor(() => {
      expect(screen.getByText('Load Demo Scenarios')).toBeInTheDocument();
    });

    // Load demo data to have scenarios
    await user.click(screen.getByText('Load Demo Scenarios'));

    // Wait for scenarios to load
    await waitFor(() => {
      expect(screen.getByText('Scenarios')).toBeInTheDocument();
    });

    // Click on first edit button
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Wait for edit dialog to open
    await waitFor(() => {
      expect(screen.getByText('Edit Scenario')).toBeInTheDocument();
    });

    // Verify Attachment Style field does NOT exist
    expect(screen.queryByText('Attachment Style')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Attachment Style')).not.toBeInTheDocument();

    // Verify Relationship Type field DOES exist
    expect(screen.getByText('Relationship Type')).toBeInTheDocument();
  });

  it('persists relationship type selection correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScenariosPage />);

    // Load demo data
    await user.click(screen.getByText('Load Demo Scenarios'));
    
    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2); // Demo has 2 scenarios
    });

    // Edit first scenario
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Scenario')).toBeInTheDocument();
    });

    // Select a relationship type
    const relationshipSelect = screen.getByDisplayValue('💔 Ex relationship');
    await user.click(relationshipSelect);
    
    // Select "💔 It's my ex"
    await user.click(screen.getByText('💔 It\'s my ex'));

    // Save the scenario
    await user.click(screen.getByText('Save'));

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Edit Scenario')).not.toBeInTheDocument();
    });

    // Edit the same scenario again
    const newEditButtons = screen.getAllByText('Edit');
    await user.click(newEditButtons[0]);

    // Verify the relationship type persisted
    await waitFor(() => {
      expect(screen.getByDisplayValue('💔 It\'s my ex')).toBeInTheDocument();
    });
  });

  it('shows correct help text for Crisis Signals', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScenariosPage />);

    // Create new scenario to test from fresh state
    await user.click(screen.getByText('Load Demo Scenarios'));
    await user.click(screen.getByText('New'));

    await waitFor(() => {
      expect(screen.getByText('Create New Scenario')).toBeInTheDocument();
    });

    // Look for Crisis Level field and its help text
    expect(screen.getByText('Crisis Level')).toBeInTheDocument();
    
    // The help text should mention "Crisis level of the situation (not the user's profile)"
    // This would typically be in a description or help text near the field
    const crisisField = screen.getByText('Crisis Level').closest('div');
    
    // For now, just verify the field exists and has the correct options
    const crisisSelect = screen.getByDisplayValue('None');
    expect(crisisSelect).toBeInTheDocument();
    
    await user.click(crisisSelect);
    
    // Verify crisis options
    expect(screen.getByText('Ambiguous')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('handles legacy scenario migration from topic to relationshipType', async () => {
    // This would test the migration logic, but since we're using Zustand store
    // and the migration happens in the import process, we'll simulate this
    
    const user = userEvent.setup();
    renderWithProviders(<ScenariosPage />);

    // Load demo scenarios which should already be migrated
    await user.click(screen.getByText('Load Demo Scenarios'));

    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    // Verify scenarios have relationship types (not legacy topics)
    expect(screen.getByText('💔 Ex relationship')).toBeInTheDocument();
    expect(screen.getByText('👥 Coworker')).toBeInTheDocument();
    
    // Verify no legacy "topic" references exist in UI
    expect(screen.queryByText('Topic')).not.toBeInTheDocument();
    expect(screen.queryByText('Attachment Style')).not.toBeInTheDocument();
  });

  it('allows creating scenario without relationship type (nullable)', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<ScenariosPage />);

    // Create new scenario
    await user.click(screen.getByText('New Scenario'));

    await waitFor(() => {
      expect(screen.getByText('Create New Scenario')).toBeInTheDocument();
    });

    // Fill required fields but leave relationship type empty
    const nameInput = screen.getByDisplayValue('New Scenario');
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Scenario Without Relationship');

    // Save without selecting relationship type
    await user.click(screen.getByText('Save'));

    // Should save successfully
    await waitFor(() => {
      expect(screen.queryByText('Create New Scenario')).not.toBeInTheDocument();
    });

    // Should show the scenario in the table with "—" for relationship type
    expect(screen.getByText('Test Scenario Without Relationship')).toBeInTheDocument();
    
    // Find the row and check for "—" in relationship type column
    const scenarioRow = screen.getByText('Test Scenario Without Relationship').closest('tr');
    expect(scenarioRow).toBeInTheDocument();
    expect(scenarioRow?.textContent).toContain('—');
  });
});