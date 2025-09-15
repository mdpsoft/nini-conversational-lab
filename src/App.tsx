import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import SettingsPage from "./pages/settings/SettingsPage";
import ScenariosPage from "./pages/scenarios/ScenariosPage";
import RunPage from "./pages/run/RunPage";
import ResultsPage from "./pages/results/ResultsPage";
import BatchRunReportPage from "./pages/batch-report/BatchRunReportPage";
import RunRepositoryPage from "./pages/repository/RunRepositoryPage";
import LLMLogsPage from "./pages/llm-logs/LLMLogsPage";
import ProfilesPage from "./pages/profiles/ProfilesPage";
import SupabaseSQLPage from "./pages/SupabaseSQLPage";
import SupabaseValidatorPage from "./pages/SupabaseValidatorPage";
import { useSettingsStore } from "./store/settings";
import { useScenariosStore } from "./store/scenarios";

const queryClient = new QueryClient();

const App = () => {
  const { loadEncryptedKey, xmlSystemSpec } = useSettingsStore();
  const { scenarios, initializeDemoData } = useScenariosStore();

  useEffect(() => {
    // Load encrypted API key if available
    loadEncryptedKey();
    
    // Initialize demo scenarios if none exist
    if (scenarios.length === 0) {
      initializeDemoData();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="settings" element={<SettingsPage />} />
              <Route path="scenarios" element={<ScenariosPage />} />
              <Route path="run" element={<RunPage />} />
              <Route path="results" element={<ResultsPage />} />
              <Route path="batch-report" element={<BatchRunReportPage />} />
              <Route path="repository" element={<RunRepositoryPage />} />
              <Route path="llm-logs" element={<LLMLogsPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="supabase-sql" element={<SupabaseSQLPage />} />
              <Route path="supabase-validate" element={<SupabaseValidatorPage />} />
              <Route 
                index
                element={
                  !xmlSystemSpec ? 
                    <Navigate to="/settings" replace /> : 
                    <Navigate to="/scenarios" replace />
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;