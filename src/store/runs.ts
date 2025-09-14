import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RunSummary, RunResult, Conversation } from '../types/core';

export interface RunProgress {
  scenarioIndex: number;
  conversationIndex: number;
  turnIndex: number;
  totalScenarios: number;
  totalConversations: number;
  isComplete: boolean;
}

export interface RunsState {
  runs: RunSummary[];
  activeRun: RunSummary | null;
  progress: RunProgress | null;
  
  // Real-time conversation state
  currentConversation: Conversation | null;
  
  // Filters and view state
  filters: {
    dateRange?: { start: string; end: string };
    scenarioIds?: string[];
    status?: 'approved' | 'rejected' | 'critical';
  };
  
  // Actions
  startRun: (runId: string) => void;
  updateProgress: (progress: RunProgress) => void;
  updateCurrentConversation: (conversation: Conversation) => void;
  completeRun: (runSummary: RunSummary) => void;
  abortRun: () => void;
  
  deleteRun: (runId: string) => void;
  deleteRuns: (runIds: string[]) => void;
  
  setFilters: (filters: Partial<RunsState['filters']>) => void;
  clearFilters: () => void;
  
  exportRun: (runId: string) => RunSummary | null;
  importRun: (runSummary: RunSummary) => boolean;
}

export const useRunsStore = create<RunsState>()(
  persist(
    (set, get) => ({
      runs: [],
      activeRun: null,
      progress: null,
      currentConversation: null,
      filters: {},
      
      startRun: (runId) => {
        const newRun: RunSummary = {
          runId,
          createdAt: new Date().toISOString(),
          results: [],
        };
        
        set({
          activeRun: newRun,
          progress: {
            scenarioIndex: 0,
            conversationIndex: 0,
            turnIndex: 0,
            totalScenarios: 0,
            totalConversations: 0,
            isComplete: false,
          },
          currentConversation: null,
        });
      },
      
      updateProgress: (progress) => set({ progress }),
      
      updateCurrentConversation: (conversation) => set({ currentConversation: conversation }),
      
      completeRun: (runSummary) => {
        set((state) => ({
          runs: [runSummary, ...state.runs],
          activeRun: null,
          progress: null,
          currentConversation: null,
        }));
      },
      
      abortRun: () => {
        set({
          activeRun: null,
          progress: null,
          currentConversation: null,
        });
      },
      
      deleteRun: (runId) => {
        set((state) => ({
          runs: state.runs.filter((run) => run.runId !== runId),
        }));
      },
      
      deleteRuns: (runIds) => {
        set((state) => ({
          runs: state.runs.filter((run) => !runIds.includes(run.runId)),
        }));
      },
      
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },
      
      clearFilters: () => set({ filters: {} }),
      
      exportRun: (runId) => {
        return get().runs.find((run) => run.runId === runId) || null;
      },
      
      importRun: (runSummary) => {
        try {
          // Basic validation
          if (!runSummary.runId || !runSummary.createdAt || !Array.isArray(runSummary.results)) {
            return false;
          }
          
          set((state) => ({
            runs: [runSummary, ...state.runs],
          }));
          
          return true;
        } catch (error) {
          console.error('Failed to import run:', error);
          return false;
        }
      },
    }),
    {
      name: 'nini-runs',
      partialize: (state) => ({
        runs: state.runs,
        // Don't persist active run state or real-time data
      }),
    }
  )
);