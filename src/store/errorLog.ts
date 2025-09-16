import { create } from 'zustand';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  componentName?: string;
  message: string;
  stack?: string;
  errorInfo?: string; // React error info componentStack
}

interface ErrorLogStore {
  errors: ErrorLogEntry[];
  addError: (error: Omit<ErrorLogEntry, 'id' | 'timestamp'>) => void;
  clearErrors: () => void;
}

export const useErrorLogStore = create<ErrorLogStore>((set) => ({
  errors: [],
  
  addError: (errorData) => {
    const errorEntry: ErrorLogEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...errorData,
    };
    
    set((state) => ({
      errors: [errorEntry, ...state.errors].slice(0, 100) // Keep last 100 errors
    }));
  },
  
  clearErrors: () => set({ errors: [] }),
}));