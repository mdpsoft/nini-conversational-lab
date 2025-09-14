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
          <Layout>
            <Routes>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/run" element={<RunPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route 
                path="/" 
                element={
                  !xmlSystemSpec ? 
                    <Navigate to="/settings" replace /> : 
                    <Navigate to="/scenarios" replace />
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;