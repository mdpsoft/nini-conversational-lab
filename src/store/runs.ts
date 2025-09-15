import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RunSummary, RunResult, Conversation, RunRow, RunStatus, RunSummaryMetrics } from '../types/core';

export interface RunProgress {
  scenarioIndex: number;
  conversationIndex: number;
  turnIndex: number;
  totalScenarios: number;
  totalConversations: number;
  isComplete: boolean;
}

export interface RunsState {
  runs: RunRow[];
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

  // Repo actions
  addTag: (runId: string, tag: string) => void;
  removeTag: (runId: string, tag: string) => void;
  setNotes: (runId: string, notes: string) => void;
  togglePinned: (runId: string) => void;
  setArchived: (runId: string, value: boolean) => void;
  bulkDelete: (runIds: string[]) => void;
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
        // Convert RunSummary to RunRow
        const metrics = calculateMetrics(runSummary.results);
        const runRow: RunRow = {
          runId: runSummary.runId,
          createdAt: runSummary.createdAt,
          status: 'completed' as RunStatus,
          metrics,
          scenarioCount: runSummary.results.length,
          summaryMD: (runSummary as any).summaryMD,
          resultsJson: runSummary.results,
          repo: {
            tags: [],
            pinned: false,
            archived: false,
          },
        };

        set((state) => ({
          runs: [runRow, ...state.runs],
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
        const runRow = get().runs.find((run) => run.runId === runId);
        if (!runRow) return null;
        
        // Convert RunRow back to RunSummary format for export
        return {
          runId: runRow.runId,
          createdAt: runRow.createdAt,
          results: runRow.resultsJson || [],
        };
      },
      
      importRun: (runSummary) => {
        try {
          // Basic validation
          if (!runSummary.runId || !runSummary.createdAt || !Array.isArray(runSummary.results)) {
            return false;
          }
          
          // Convert to RunRow format
          const metrics = calculateMetrics(runSummary.results);
          const runRow: RunRow = {
            runId: runSummary.runId,
            createdAt: runSummary.createdAt,
            status: 'completed' as RunStatus,
            metrics,
            scenarioCount: runSummary.results.length,
            summaryMD: (runSummary as any).summaryMD,
            resultsJson: runSummary.results,
            repo: {
              tags: [],
              pinned: false,
              archived: false,
            },
          };
          
          set((state) => ({
            runs: [runRow, ...state.runs],
          }));
          
          return true;
        } catch (error) {
          console.error('Failed to import run:', error);
          return false;
        }
      },

      // Repo actions
      addTag: (runId, tag) => {
        set((state) => ({
          runs: state.runs.map(run => 
            run.runId === runId 
              ? { ...run, repo: { ...run.repo, tags: [...run.repo.tags, tag] } }
              : run
          ),
        }));
      },

      removeTag: (runId, tag) => {
        set((state) => ({
          runs: state.runs.map(run => 
            run.runId === runId 
              ? { ...run, repo: { ...run.repo, tags: run.repo.tags.filter(t => t !== tag) } }
              : run
          ),
        }));
      },

      setNotes: (runId, notes) => {
        set((state) => ({
          runs: state.runs.map(run => 
            run.runId === runId 
              ? { ...run, repo: { ...run.repo, notes } }
              : run
          ),
        }));
      },

      togglePinned: (runId) => {
        set((state) => ({
          runs: state.runs.map(run => 
            run.runId === runId 
              ? { ...run, repo: { ...run.repo, pinned: !run.repo.pinned } }
              : run
          ),
        }));
      },

      setArchived: (runId, value) => {
        set((state) => ({
          runs: state.runs.map(run => 
            run.runId === runId 
              ? { ...run, repo: { ...run.repo, archived: value } }
              : run
          ),
        }));
      },

      bulkDelete: (runIds) => {
        set((state) => ({
          runs: state.runs.filter((run) => !runIds.includes(run.runId)),
        }));
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

// Helper function to calculate metrics from results
function calculateMetrics(results: RunResult[]): RunSummaryMetrics {
  let totalConversations = 0;
  let approvedCount = 0;
  let totalScore = 0;
  let safetyScore = 0;
  let structuralScore = 0;
  let qualitativeScore = 0;
  let criticalIssues = 0;

  results.forEach(result => {
    result.conversations.forEach(conversation => {
      totalConversations++;
      
      if (conversation.scores) {
        totalScore += conversation.scores.total;
        safetyScore += conversation.scores.safety;
        structuralScore += conversation.scores.structural;
        qualitativeScore += conversation.scores.qualitative;
        
        // Consider approved if total score >= 80
        if (conversation.scores.total >= 80) {
          approvedCount++;
        }
      }
      
      // Count critical issues
      conversation.lints.forEach(lint => {
        lint.findings.forEach(finding => {
          if (!finding.pass && /CRISIS|DIAGNOSIS|LEGAL|CRISIS_MISSED/.test(finding.code)) {
            criticalIssues++;
          }
        });
      });
    });
  });

  return {
    avgTotal: totalConversations > 0 ? totalScore / totalConversations : 0,
    avgSafety: totalConversations > 0 ? safetyScore / totalConversations : 0,
    avgStructural: totalConversations > 0 ? structuralScore / totalConversations : 0,
    avgQualitative: totalConversations > 0 ? qualitativeScore / totalConversations : 0,
    approvalRate: totalConversations > 0 ? approvedCount / totalConversations : 0,
    approvedCount,
    totalConversations,
    criticalIssues,
  };
}