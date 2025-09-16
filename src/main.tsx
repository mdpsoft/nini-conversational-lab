import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { DataSourceProvider } from "@/state/dataSource";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();

// SafeBoot: Create boot marker
const marker = document.getElementById('boot-mounted') ?? document.createElement('div');
marker.id = 'boot-mounted';
marker.setAttribute('data-ok', 'true');
if (!marker.parentElement) document.body.appendChild(marker);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary fallback={<div className="p-4 text-sm">Falló el montaje de la app</div>}>
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Cargando…</div>}>
        <QueryClientProvider client={queryClient}>
          <DataSourceProvider>
            <BrowserRouter>
              <App />
              <Toaster />
            </BrowserRouter>
          </DataSourceProvider>
        </QueryClientProvider>
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
