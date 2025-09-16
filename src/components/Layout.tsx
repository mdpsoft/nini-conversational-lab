import { Moon, Sun } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSettingsStore } from "../store/settings";
import { UserMenu } from "@/components/UserMenu";
import { CollapsibleNav } from "./CollapsibleNav";
import { DataSourceSelector } from "@/components/DataSourceSelector";
import { useDevAutoLogin } from "@/hooks/useDevAutoLogin";
import { useDataSource } from "@/state/dataSource";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="h-12 p-4 border-b flex items-center">
          <h2 className="font-semibold text-sidebar-foreground">Nini Test Bench</h2>
        </div>
        <CollapsibleNav />
      </SidebarContent>
    </Sidebar>
  );
}

function Layout() {
  const { darkMode, setDarkMode } = useSettingsStore();
  const { devAutoLoginUsed } = useDevAutoLogin();
  const { state } = useDataSource();
  const { isValid: realtimeValid, isLoading: realtimeLoading } = useRealtimeStatus();
  
  const isRealtimeDisabled = localStorage.getItem('realtimeDisabled') === 'true';
  const isSafeBoot = localStorage.getItem('safe-boot') === 'true';

  const clearSafeBoot = () => {
    localStorage.removeItem('safe-boot');
    localStorage.removeItem('realtimeDisabled');
    window.location.reload();
  };

  const enableRealtime = () => {
    localStorage.removeItem('realtimeDisabled');
    window.location.reload();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center justify-between border-b px-4">
            <div className="flex items-center">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-lg font-semibold">Nini Test Bench</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* UI Smoke Indicator */}
              <div data-testid="ui-smoke" className="px-2 py-1 text-xs opacity-70 bg-muted rounded">
                UI OK · {state.source} · Realtime {
                  isRealtimeDisabled ? 'Off' : 
                  realtimeLoading ? 'Checking...' :
                  realtimeValid ? 'On' : 
                  <a href="/dev/supabase-check#realtime" className="text-primary hover:underline">
                    Off (fix)
                  </a>
                }
              </div>
              
              {/* SafeBoot indicator and controls */}
              {isSafeBoot && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">SafeBoot</Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearSafeBoot}
                    className="text-xs h-6"
                  >
                    Clear SafeBoot
                  </Button>
                </div>
              )}
              
              {/* Realtime controls */}
              {isRealtimeDisabled && !isSafeBoot && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Realtime: Off (auto)</Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={enableRealtime}
                    className="text-xs h-6"
                  >
                    Enable Realtime
                  </Button>
                </div>
              )}
              
              {/* Data source selector */}
              <DataSourceSelector />
              
              {/* Dev auto-login indicator */}
              {devAutoLoginUsed && (
                <Badge variant="secondary" className="text-xs">
                  Dev Auto-Login
                </Badge>
              )}
              
              <UserMenu />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default Layout;