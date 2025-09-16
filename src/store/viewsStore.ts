import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RepositoryFilters {
  query: string;
  status: "" | "all" | "completed" | "failed" | "aborted";
  hideArchived: boolean;
  dateRange?: { start: string; end: string };
  approvalRateMin?: number;
  tags?: string[];
  relationshipTypes?: string[]; // Added relationship type filter
}

export interface SavedView {
  id: string;
  name: string;
  filters: RepositoryFilters;
  sort?: { key: string; dir: "asc" | "desc" };
  createdAt: string;
}

interface ViewsState {
  savedViews: SavedView[];
  currentView?: string; // ID of currently applied view
  
  // Actions
  addView: (view: Omit<SavedView, "id" | "createdAt">) => void;
  removeView: (id: string) => void;
  updateView: (id: string, updates: Partial<SavedView>) => void;
  applyView: (id: string) => SavedView | null;
  clearCurrentView: () => void;
}

export const useViewsStore = create<ViewsState>()(
  persist(
    (set, get) => ({
      savedViews: [
        // Default views
        {
          id: "all-runs",
          name: "All Runs",
          filters: {
            query: "",
            status: "all",
            hideArchived: false,
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: "recent-completed",
          name: "Recent Completed",
          filters: {
            query: "",
            status: "completed",
            hideArchived: true,
          },
          sort: { key: "createdAt", dir: "desc" },
          createdAt: new Date().toISOString(),
        },
        {
          id: "high-performance",
          name: "High Performance",
          filters: {
            query: "",
            status: "completed",
            hideArchived: true,
            approvalRateMin: 80,
          },
          sort: { key: "avgTotal", dir: "desc" },
          createdAt: new Date().toISOString(),
        },
      ],
      currentView: undefined,
      
      addView: (viewData) => {
        const newView: SavedView = {
          ...viewData,
          id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          savedViews: [...state.savedViews, newView],
        }));
      },
      
      removeView: (id) => {
        set((state) => ({
          savedViews: state.savedViews.filter(v => v.id !== id),
          currentView: state.currentView === id ? undefined : state.currentView,
        }));
      },
      
      updateView: (id, updates) => {
        set((state) => ({
          savedViews: state.savedViews.map(v => 
            v.id === id ? { ...v, ...updates } : v
          ),
        }));
      },
      
      applyView: (id) => {
        const view = get().savedViews.find(v => v.id === id);
        if (view) {
          set({ currentView: id });
          return view;
        }
        return null;
      },
      
      clearCurrentView: () => {
        set({ currentView: undefined });
      },
    }),
    {
      name: "nini-repository-views",
      partialize: (state) => ({
        savedViews: state.savedViews.filter(v => !["all-runs", "recent-completed", "high-performance"].includes(v.id)),
      }),
    }
  )
);