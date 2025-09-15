import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, RotateCcw, Minimize2, Maximize2 } from "lucide-react";

const STORAGE_KEY = "nav_groups_state";

export default function NavDebugPage() {
  const [navState, setNavState] = useState<Record<string, boolean>>({});
  const [liveStatus, setLiveStatus] = useState<Record<string, boolean>>({});

  const readNavState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const state = saved ? JSON.parse(saved) : {};
      setNavState(state);
      setLiveStatus(state);
      return state;
    } catch (error) {
      console.error("Failed to read nav state:", error);
      const empty = {};
      setNavState(empty);
      setLiveStatus(empty);
      return empty;
    }
  };

  const writeNavState = (newState: Record<string, boolean>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setNavState(newState);
      setLiveStatus(newState);
      // Dispatch custom event to notify nav component
      window.dispatchEvent(new CustomEvent('nav:state:changed', { detail: newState }));
    } catch (error) {
      console.error("Failed to write nav state:", error);
    }
  };

  const collapseWorkspace = () => {
    const current = readNavState();
    writeNavState({ ...current, "Workspace": false });
  };

  const expandWorkspace = () => {
    const current = readNavState();
    writeNavState({ ...current, "Workspace": true });
  };

  const resetNavState = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setNavState({});
      setLiveStatus({});
      window.dispatchEvent(new CustomEvent('nav:state:changed', { detail: {} }));
    } catch (error) {
      console.error("Failed to reset nav state:", error);
    }
  };

  const emitRerender = () => {
    const current = readNavState();
    window.dispatchEvent(new CustomEvent('nav:state:changed', { detail: current }));
  };

  useEffect(() => {
    readNavState();

    // Listen for nav state changes
    const handleNavStateChange = (event: CustomEvent) => {
      console.debug("[NavDebug] Received nav:state:changed:", event.detail);
      setLiveStatus(event.detail || {});
    };

    window.addEventListener('nav:state:changed', handleNavStateChange as EventListener);
    
    return () => {
      window.removeEventListener('nav:state:changed', handleNavStateChange as EventListener);
    };
  }, []);

  const groupNames = ["Workspace", "Personas", "Results", "Debug & QA", "Data & SQL", "Settings"];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Navigation State Inspector</h1>
        <p className="text-muted-foreground mt-2">
          Debug and control the collapsible navigation state
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current State Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              localStorage State
            </CardTitle>
            <CardDescription>
              Raw state stored in localStorage['{STORAGE_KEY}']
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-auto">
              {JSON.stringify(navState, null, 2)}
            </pre>
            
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={readNavState}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Status */}
        <Card>
          <CardHeader>
            <CardTitle>Live Status</CardTitle>
            <CardDescription>
              Current expansion state of navigation groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupNames.map(groupName => {
                const isExpanded = liveStatus[groupName];
                const hasState = groupName in liveStatus;
                
                return (
                  <div key={groupName} className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium">{groupName}:</span>
                    <div className="flex gap-2">
                      {!hasState ? (
                        <Badge variant="outline">default</Badge>
                      ) : (
                        <Badge variant={isExpanded ? "default" : "secondary"}>
                          {isExpanded ? "expanded" : "collapsed"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Controls</CardTitle>
          <CardDescription>
            Manually control navigation state for testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Workspace Controls */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Workspace Controls</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={collapseWorkspace}>
                  <Minimize2 className="h-3 w-3 mr-1" />
                  Collapse Workspace
                </Button>
                <Button variant="outline" size="sm" onClick={expandWorkspace}>
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Expand Workspace
                </Button>
              </div>
            </div>

            {/* Global Controls */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Global Controls</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetNavState}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Nav State
                </Button>
                <Button variant="outline" size="sm" onClick={emitRerender}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Emit Re-render
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-4" />
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Changes are immediately persisted to localStorage</p>
            <p>• Custom event 'nav:state:changed' is dispatched to notify navigation component</p>
            <p>• Reset will remove the localStorage key entirely</p>
            <p>• Re-render forces the navigation to re-read the current state</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}