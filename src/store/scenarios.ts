import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Scenario, ScenarioSchema } from '../types/scenario';
import { generateId } from '../utils/seeds';
import { getDemoScenarios } from '../utils/seeds';
import { migrateLegacyScenario } from '../utils/scenarioMigration';

export interface ScenariosState {
  scenarios: Scenario[];
  selectedIds: string[];
  
  // Actions
  addScenario: (scenario: Omit<Scenario, 'id'>) => void;
  updateScenario: (id: string, scenario: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  deleteScenarios: (ids: string[]) => void;
  duplicateScenario: (id: string) => void;
  
  setSelectedIds: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  importScenarios: (scenarios: Scenario[]) => { success: number; errors: string[] };
  exportScenarios: (ids?: string[]) => Scenario[];
  
  initializeDemoData: () => void;
}

export const useScenariosStore = create<ScenariosState>()(
  persist(
    (set, get) => ({
      scenarios: [],
      selectedIds: [],
      
      addScenario: (scenarioData) => {
        const scenario: Scenario = {
          ...scenarioData,
          id: generateId(),
        };
        
        set((state) => ({
          scenarios: [...state.scenarios, scenario],
        }));
      },
      
      updateScenario: (id: string, updates: Partial<Scenario>) => {
        set((state) => ({
          scenarios: state.scenarios.map((scenario) =>
            scenario.id === id ? { ...scenario, ...updates } : scenario
          ),
        }));
      },
      
      deleteScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((scenario) => scenario.id !== id),
          selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
        }));
      },
      
      deleteScenarios: (ids) => {
        set((state) => ({
          scenarios: state.scenarios.filter((scenario) => !ids.includes(scenario.id)),
          selectedIds: state.selectedIds.filter((selectedId) => !ids.includes(selectedId)),
        }));
      },
      
      duplicateScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;
        
        const duplicate: Scenario = {
          ...scenario,
          id: generateId(),
          name: `${scenario.name} (Copy)`,
        };
        
        set((state) => ({
          scenarios: [...state.scenarios, duplicate],
        }));
      },
      
      setSelectedIds: (selectedIds) => set({ selectedIds }),
      
      toggleSelected: (id) => {
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id],
        }));
      },
      
      selectAll: () => {
        set((state) => ({
          selectedIds: state.scenarios.map((scenario) => scenario.id),
        }));
      },
      
      clearSelection: () => set({ selectedIds: [] }),
      
      importScenarios: (scenarios: any[]) => {
        const errors: string[] = [];
        const validScenarios: Scenario[] = [];
        
        scenarios.forEach((scenario, index) => {
          try {
            // First try to migrate legacy scenarios
            const migrated = migrateLegacyScenario(scenario);
            const validated = ScenarioSchema.parse(migrated);
            
            // Check for duplicate IDs and ensure full Scenario type
            const existingScenario = get().scenarios.find((s) => s.id === validated.id);
            const completeScenario: Scenario = existingScenario 
              ? { ...validated, id: generateId() } as Scenario
              : validated as Scenario;
            validScenarios.push(completeScenario);
          } catch (error) {
            errors.push(`Scenario ${index + 1}: ${error instanceof Error ? error.message : 'Invalid format'}`);
          }
        });
        
        if (validScenarios.length > 0) {
          set((state) => ({
            scenarios: [...state.scenarios, ...validScenarios],
          }));
        }
        
        return { success: validScenarios.length, errors };
      },
      
      exportScenarios: (ids) => {
        const { scenarios, selectedIds } = get();
        const exportIds = ids || selectedIds;
        
        if (exportIds.length === 0) return scenarios;
        
        return scenarios.filter((scenario) => exportIds.includes(scenario.id));
      },
      
      initializeDemoData: () => {
        const demoScenarios = getDemoScenarios();
        // Migrate demo scenarios to new format
        const migratedScenarios = demoScenarios.map(scenario => migrateLegacyScenario(scenario as any));
        set({ scenarios: migratedScenarios });
      },
    }),
    {
      name: 'nini-scenarios',
    }
  )
);