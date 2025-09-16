import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { DataSourceProvider } from "@/state/dataSource";
import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DataSourceProvider>
        <BrowserRouter>
          <App />
          <Toaster />
        </BrowserRouter>
      </DataSourceProvider>
    </QueryClientProvider>
  </StrictMode>,
);
