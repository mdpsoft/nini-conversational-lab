import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/render';
import { selectRelationshipType } from '@/test/assertions';
import ScenariosPage from '@/pages/scenarios/ScenariosPage';
import userEvent from '@testing-library/user-event';

describe('Scenario Editor Sentinel Tests', () => {
  beforeEach(() => {
    // Clear any existing scenarios in store
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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
    expect(screen.queryByText(/Attachment Style/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Attachment Style/i)).not.toBeInTheDocument();

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

    // Select a relationship type using the helper
    await selectRelationshipType('💔 It\'s my ex');

    // Save the scenario
    await user.click(screen.getByText('Save'));

    // Wait for dialog to close
    await waitFor(() => {
      expect(screen.queryByText('Edit Scenario')).not.toBeInTheDocument();
    });

    // Verify the badge shows in the table
    expect(screen.getByText('💔 It\'s my ex')).toBeInTheDocument();

    // Edit the same scenario again
    const newEditButtons = screen.getAllByText('Edit');
    await user.click(newEditButtons[0]);

    // Verify the relationship type persisted in the form
    await waitFor(() => {
      // The select should show the chosen value
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

    // Look for Crisis Level field
    expect(screen.getByText('Crisis Level')).toBeInTheDocument();
    
    // Verify the field has the correct options
    const crisisSelect = screen.getByDisplayValue('None');
    expect(crisisSelect).toBeInTheDocument();
    
    await user.click(crisisSelect);
    
    // Verify crisis options
    expect(screen.getByText('Ambiguous')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
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

  it('handles v2 scenario migration correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScenariosPage />);

    // Load demo scenarios which should already be migrated to v2
    await user.click(screen.getByText('Load Demo Scenarios'));

    await waitFor(() => {
      expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    // Verify scenarios show relationship types (v2), not legacy topics
    expect(screen.getByText('💔 Ex relationship')).toBeInTheDocument();
    expect(screen.getByText('👥 Coworker')).toBeInTheDocument();
    
    // Verify no legacy "topic" or "Attachment Style" references exist in UI
    expect(screen.queryByText('Topic')).not.toBeInTheDocument();
    expect(screen.queryByText('Attachment Style')).not.toBeInTheDocument();

    // Edit a scenario to verify it uses v2 structure
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Scenario')).toBeInTheDocument();
    });

    // Should have Relationship Type field (v2)
    expect(screen.getByText('Relationship Type')).toBeInTheDocument();
    // Should have Crisis Level field (v2, renamed from crisis_signals)
    expect(screen.getByText('Crisis Level')).toBeInTheDocument();
    // Should NOT have Attachment Style (legacy)
    expect(screen.queryByText('Attachment Style')).not.toBeInTheDocument();
  });
});