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
import ConversationsPage from "./pages/results/ConversationsPage";
import RunDetailsPage from "./pages/results/RunDetailsPage";
import BatchRunReportPage from "./pages/batch-report/BatchRunReportPage";
import RunRepositoryPage from "./pages/repository/RunRepositoryPage";
import LLMLogsPage from "./pages/llm-logs/LLMLogsPage";
import ProfilesPage from "./pages/profiles/ProfilesPage";
import CompareProfilesPage from "./pages/profiles/CompareProfilesPage";
import SavedViewsPage from "./pages/settings/SavedViewsPage";
import EnvironmentPage from "./pages/settings/EnvironmentPage";
import AuthChecksPage from "./pages/settings/AuthChecksPage";
import ScenarioAuditPage from "./pages/dev/ScenarioAuditPage";
import ErrorLogPage from "./pages/dev/ErrorLogPage";
import BlankTestPage from "./pages/dev/BlankTestPage";
import NavDebugPage from "./pages/settings/NavDebugPage";
import LLMErrorInspectorPage from "./pages/debug/LLMErrorInspectorPage";
import SupabaseSQLPage from "./pages/SupabaseSQLPage";
import SupabaseValidatorPage from "./pages/SupabaseValidatorPage";
import SupabaseSQLPhase2Page from "./pages/SupabaseSQLPhase2Page";
import ExpressCheckPage from "./pages/dev/ExpressCheckPage";
import { useSettingsStore } from "./store/settings";
import { useScenariosStore } from "./store/scenarios";
import { useDevAutoLogin } from "./hooks/useDevAutoLogin";

const queryClient = new QueryClient();

const App = () => {
  const { loadEncryptedKey, xmlSystemSpec } = useSettingsStore();
  const { scenarios, initializeDemoData } = useScenariosStore();
  
  // Initialize dev auto-login (will attempt login if configured)
  useDevAutoLogin();

  // Check if we should show dev routes
  const isDevMode = import.meta.env.DEV || 
                   typeof window !== 'undefined' && localStorage.getItem('debug-errors') === 'true';

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
        <Routes>
          <Route path="/" element={<Layout />}>
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/env" element={<EnvironmentPage />} />
              <Route path="settings/auth-checks" element={<AuthChecksPage />} />
              <Route path="dev/scenario-audit" element={<ScenarioAuditPage />} />
              {isDevMode && (
                <Route path="dev/express-check" element={<ExpressCheckPage />} />
              )}
              {isDevMode && (
                <Route path="dev/error-log" element={<ErrorLogPage />} />
              )}
              {isDevMode && (
                <Route path="dev/blank-test" element={<BlankTestPage />} />
              )}
              <Route path="settings/nav-debug" element={<NavDebugPage />} />
              <Route path="scenarios" element={<ScenariosPage />} />
              <Route path="run" element={<RunPage />} />
              <Route path="results" element={<ConversationsPage />} />
              <Route path="results/:runId" element={<RunDetailsPage />} />
              <Route path="batch-report" element={<BatchRunReportPage />} />
              <Route path="repository" element={<RunRepositoryPage />} />
              <Route path="llm-logs" element={<LLMLogsPage />} />
              <Route path="llm-error-inspector" element={<LLMErrorInspectorPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route path="profiles/compare" element={<CompareProfilesPage />} />
              <Route path="saved-views" element={<SavedViewsPage />} />
              <Route path="supabase-sql" element={<SupabaseSQLPage />} />
              <Route path="supabase-validate" element={<SupabaseValidatorPage />} />
              <Route path="supabase-sql-phase2" element={<SupabaseSQLPhase2Page />} />
              <Route 
                index
                element={
                  !xmlSystemSpec ? 
                    <Navigate to="/settings" replace /> : 
                    <Navigate to="/scenarios" replace />
                } 
              />
            <Route path="*" element={<div className="p-6 text-sm">404 — route not found</div>} />
          </Route>
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;