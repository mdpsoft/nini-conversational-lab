import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isGuestModeEnabled } from '@/hooks/useGuestMode';

export type DataSource = 'supabase' | 'local' | 'guest';

export interface DataSourceState {
  source: DataSource;
  reason?: string;
}

export interface DataSourceContextType {
  state: DataSourceState;
  setDataSource: (source: DataSource) => Promise<void>;
  getRepoHealth: () => Promise<{ ok: boolean; errors: string[]; rls: boolean; tables: string[] }>;
}

const DataSourceContext = createContext<DataSourceContextType | null>(null);

const STORAGE_KEY = 'ntb:data-source';

async function detectDefaultDataSource(): Promise<DataSourceState> {
  // Check if guest mode is enabled first
  if (isGuestModeEnabled()) {
    return { source: 'guest', reason: 'Guest mode enabled' };
  }

  // Check for explicit user choice
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const choice = stored as DataSource;
      if (['supabase', 'local', 'guest'].includes(choice)) {
        return { source: choice, reason: 'User preference' };
      }
    }
  } catch (error) {
    console.warn('Failed to read data source preference:', error);
  }

  // Try to detect Supabase availability
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return { source: 'supabase', reason: 'Authenticated user detected' };
    }
    
    // Even if not authenticated, if Supabase is configured, default to it
    const SUPABASE_URL = "https://rxufqnsliggxavpfckft.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWZxbnNsaWdneGF2cGZja2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5Njk1MzAsImV4cCI6MjA3MzU0NTUzMH0.Fq2--k7MY5MWy_E9_VEg-0p573TLzvufT8Ux0JD-6Pw";
    
    if (SUPABASE_URL && SUPABASE_KEY) {
      return { source: 'supabase', reason: 'Supabase configured (not authenticated)' };
    }
  } catch (error) {
    console.warn('Failed to check Supabase auth:', error);
  }

  // Fallback to local
  return { source: 'local', reason: 'Fallback to local storage' };
}

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataSourceState>({ source: 'local' });

  useEffect(() => {
    detectDefaultDataSource().then(setState);
    
    // Listen for guest mode changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'guest_mode') {
        detectDefaultDataSource().then(setState);
      }
    };

    // Listen for data source changes from other tabs
    const handleDataSourceChange = () => {
      detectDefaultDataSource().then(setState);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('data-source-changed', handleDataSourceChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('data-source-changed', handleDataSourceChange);
    };
  }, []);

  const setDataSource = async (source: DataSource) => {
    try {
      localStorage.setItem(STORAGE_KEY, source);
      setState({ source, reason: 'User selection' });
      
      // Emit event for other components to refresh
      window.dispatchEvent(new CustomEvent('data-source-changed', { detail: { source } }));
    } catch (error) {
      console.error('Failed to save data source preference:', error);
    }
  };

  const getRepoHealth = async () => {
    const health = {
      ok: true,
      errors: [] as string[],
      rls: false,
      tables: [] as string[]
    };

    if (state.source === 'supabase') {
      try {
        // Check auth status
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
          health.errors.push(`Auth error: ${authError.message}`);
          health.ok = false;
        }

        // Check tables existence
        const tablesToCheck = ['userai_profiles', 'runs', 'turns', 'events'];
        for (const table of tablesToCheck) {
          try {
            const { error } = await (supabase as any).from(table).select('*').limit(1);
            if (error) {
              if (error.message.includes('table') && error.message.includes('not found')) {
                health.errors.push(`Table '${table}' not found`);
                health.ok = false;
              } else if (error.message.includes('permission denied') || error.code === 'PGRST301') {
                health.rls = true;
                health.tables.push(table);
              } else {
                health.errors.push(`Table '${table}': ${error.message}`);
                health.ok = false;
              }
            } else {
              health.tables.push(table);
            }
          } catch (err) {
            health.errors.push(`Failed to check table '${table}': ${err}`);
            health.ok = false;
          }
        }
      } catch (error) {
        health.errors.push(`Failed to check Supabase health: ${error}`);
        health.ok = false;
      }
    }

    return health;
  };

  const contextValue = { state, setDataSource, getRepoHealth };
  
  return (
    <DataSourceContext.Provider value={contextValue}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
}