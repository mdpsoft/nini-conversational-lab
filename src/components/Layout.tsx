import { Settings, FileText, Play, BarChart3, Moon, Sun, FolderArchive, Bug, User, TrendingUp, Database } from "lucide-react";
import { NavLink, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useSettingsStore } from "../store/settings";
import { SupabaseStatus } from "@/components/SupabaseStatus";

const navigationItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Scenarios", url: "/scenarios", icon: FileText },
  { title: "Run", url: "/run", icon: Play },
  { title: "Results", url: "/results", icon: BarChart3 },
  { title: "Batch Report", url: "/batch-report", icon: TrendingUp },
  { title: "Repository", url: "/repository", icon: FolderArchive },
  { title: "LLM Logs", url: "/llm-logs", icon: Bug },
  { title: "USERAI Profiles", url: "/profiles", icon: User },
  { title: "Supabase SQL", url: "/supabase-sql", icon: Database },
];

function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Nini Test Bench</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function Layout() {
  const { darkMode, setDarkMode } = useSettingsStore();

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
              <SupabaseStatus />
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