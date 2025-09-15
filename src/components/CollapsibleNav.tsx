import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { 
  FolderKanban, 
  UserSquare2, 
  ListChecks, 
  Bug, 
  Database, 
  Settings,
  FileText,
  Play,
  TrendingUp,
  GitCompare,
  Eye,
  Search,
  CheckSquare,
  FolderArchive,
  AlertTriangle,
  Code,
  Save,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  disabled?: boolean;
  tooltip?: string;
}

interface NavGroup {
  title: string;
  icon: any;
  items: NavItem[];
  defaultExpanded?: boolean;
  debug?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Workspace",
    icon: FolderKanban,
    defaultExpanded: true,
    debug: true,
    items: [
      { title: "Scenarios", url: "/scenarios", icon: FileText },
      { title: "Run Tests", url: "/run", icon: Play },
      { title: "Batch Run Report", url: "/batch-report", icon: TrendingUp },
    ]
  },
  {
    title: "Personas",
    icon: UserSquare2,
    defaultExpanded: true,
    items: [
      { title: "USERAI Profiles", url: "/profiles", icon: UserSquare2 },
      { title: "Compare Profiles", url: "/profiles/compare", icon: GitCompare },
    ]
  },
  {
    title: "Results",
    icon: ListChecks,
    defaultExpanded: true,
    items: [
      { title: "Conversations", url: "/results", icon: Eye },
      { title: "Run Repository", url: "/repository", icon: FolderArchive },
    ]
  },
  {
    title: "Debug & QA",
    icon: Bug,
    defaultExpanded: false,
    items: [
      { title: "LLM Error Inspector", url: "/llm-error-inspector", icon: AlertTriangle },
      { title: "Unified Log Viewer", url: "/llm-logs", icon: Search },
      { title: "Supabase Validate", url: "/supabase-validate", icon: CheckSquare },
    ]
  },
  {
    title: "Data & SQL",
    icon: Database,
    defaultExpanded: false,
    items: [
      { title: "Supabase SQL", url: "/supabase-sql", icon: Database },
      { title: "Supabase SQL – Phase 2", url: "/supabase-sql-phase2", icon: Code },
    ]
  },
  {
    title: "Settings",
    icon: Settings,
    defaultExpanded: false,
    items: [
      { title: "Saved Views", url: "/saved-views", icon: Save },
      { title: "Environment / API Keys", url: "/settings/env", icon: Wrench },
      { title: "Nav Debug", url: "/settings/nav-debug", icon: Bug },
      { title: "Main Settings", url: "/settings", icon: Settings },
    ]
  },
];

const STORAGE_KEY = "nav_groups_state";

export function CollapsibleNav() {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Initialize expanded state from localStorage and defaults
  useEffect(() => {
    const loadNavState = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedState = saved ? JSON.parse(saved) : {};
        
        // Merge with defaults - use saved state if exists, otherwise defaultExpanded
        const initialState = NAV_GROUPS.reduce((acc, group) => {
          const hasStoredValue = group.title in savedState;
          acc[group.title] = hasStoredValue ? savedState[group.title] : (group.defaultExpanded ?? false);
          
          if (group.debug) {
            console.debug(`[CollapsibleNav] ${group.title} mount expanded=${acc[group.title]} (stored: ${hasStoredValue})`);
          }
          
          return acc;
        }, {} as Record<string, boolean>);
        
        setExpandedGroups(initialState);
      } catch (error) {
        console.error("Failed to load navigation state:", error);
        // Use defaults
        const defaultState = NAV_GROUPS.reduce((acc, group) => {
          acc[group.title] = group.defaultExpanded ?? false;
          if (group.debug) {
            console.debug(`[CollapsibleNav] ${group.title} mount expanded=${acc[group.title]} (fallback)`);
          }
          return acc;
        }, {} as Record<string, boolean>);
        setExpandedGroups(defaultState);
      }
    };

    // Initial load
    loadNavState();

    // Listen for external state changes
    const handleNavStateChange = (event: CustomEvent) => {
      if (NAV_GROUPS.some(g => g.debug)) {
        console.debug("[CollapsibleNav] External nav:state:changed event received, re-syncing...");
      }
      loadNavState();
    };

    window.addEventListener('nav:state:changed', handleNavStateChange as EventListener);
    
    return () => {
      window.removeEventListener('nav:state:changed', handleNavStateChange as EventListener);
    };
  }, []);

  // Auto-expand group containing current route
  useEffect(() => {
    const currentPath = location.pathname;
    
    for (const group of NAV_GROUPS) {
      const hasActiveItem = group.items.some(item => {
        if (item.url === currentPath) return true;
        // Handle nested routes like /results/:runId
        if (item.url === "/results" && currentPath.startsWith("/results/")) return true;
        return false;
      });
      
      if (hasActiveItem && !expandedGroups[group.title]) {
        setExpandedGroups(prev => {
          const newState = { ...prev, [group.title]: true };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
          return newState;
        });
        break;
      }
    }
  }, [location.pathname, expandedGroups]);

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => {
      const newState = { ...prev, [groupTitle]: !prev[groupTitle] };
      
      // Find group for debug logging
      const group = NAV_GROUPS.find(g => g.title === groupTitle);
      if (group?.debug) {
        console.debug(`[CollapsibleNav] ${groupTitle} toggle -> ${newState[groupTitle]}`);
      }
      
      // Persist immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('nav:state:changed', { detail: newState }));
      
      return newState;
    });
  };

  const isActive = (path: string) => {
    if (path === location.pathname) return true;
    // Handle nested routes
    if (path === "/results" && location.pathname.startsWith("/results/")) return true;
    return false;
  };

  const handleKeyDown = (e: React.KeyboardEvent, groupTitle: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleGroup(groupTitle);
    }
  };

  return (
    <nav className="space-y-1 p-2" role="navigation" aria-label="Main navigation">
      {NAV_GROUPS.map((group) => {
        const isExpanded = expandedGroups[group.title];
        const GroupIcon = group.icon;
        
        return (
          <div key={group.title} className="space-y-1">
            {/* Group Header */}
            <button
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "transition-colors relative z-10",
                group.debug && "hover:outline hover:outline-1 hover:outline-dashed hover:outline-yellow-400"
              )}
              onClick={() => toggleGroup(group.title)}
              onKeyDown={(e) => handleKeyDown(e, group.title)}
              aria-expanded={isExpanded}
              aria-controls={`nav-group-${group.title.replace(/\s+/g, '-').toLowerCase()}`}
              style={{ pointerEvents: 'auto' }}
            >
              <GroupIcon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{group.title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>

            {/* Group Items */}
            {isExpanded && (
              <div
                id={`nav-group-${group.title.replace(/\s+/g, '-').toLowerCase()}`}
                className="ml-6 space-y-1"
                role="group"
                aria-labelledby={`nav-group-${group.title.replace(/\s+/g, '-').toLowerCase()}`}
              >
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isItemActive = isActive(item.url);
                  
                  if (item.disabled) {
                    return (
                      <div
                        key={item.title}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-sm rounded-md",
                          "text-muted-foreground cursor-not-allowed opacity-50"
                        )}
                        title={item.tooltip || "Coming soon"}
                      >
                        <ItemIcon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                    );
                  }
                  
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className={({ isActive: linkActive }) => cn(
                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "transition-colors",
                        (linkActive || isItemActive) && "bg-accent text-accent-foreground font-medium border-l-2 border-primary"
                      )}
                    >
                      <ItemIcon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}