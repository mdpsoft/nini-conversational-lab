import { Moon, Sun, Database, HardDrive } from "lucide-react";
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
import { useProfilesRepo } from "@/hooks/useProfilesRepo";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useDevAutoLogin } from "@/hooks/useDevAutoLogin";

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
  const { dataSource } = useProfilesRepo();
  const { guestMode } = useGuestMode();
  const { devAutoLoginUsed } = useDevAutoLogin();

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
              {/* Data source indicator */}
              <Badge variant="outline" className="text-xs">
                {dataSource === 'Supabase' ? (
                  <>
                    <Database className="h-3 w-3 mr-1" />
                    {guestMode ? 'Local (Guest)' : 'Supabase'}
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3 w-3 mr-1" />
                    {guestMode ? 'Local (Guest)' : 'Local'}
                  </>
                )}
              </Badge>
              
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