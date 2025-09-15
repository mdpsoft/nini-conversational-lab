import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Radio, Pause, ArrowDown, Eye, Filter, RefreshCw } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { subscribeLogs } from "@/lib/realtime";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface EventRow {
  id: number;
  ts: string;
  level: string;
  type: string;
  severity?: string;
  trace_id?: string;
  run_id?: string;
  turn_index?: number;
  scenario_id?: string;
  profile_id?: string;
  meta?: any;
  state: string;
  tags?: string[];
  isNew?: boolean; // For animation
}

interface EventFilters {
  level?: string;
  type?: string;
  severity?: string;
  runId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const LEVEL_COLORS = {
  INFO: "bg-blue-500",
  WARN: "bg-yellow-500", 
  ERROR: "bg-red-500",
  DEBUG: "bg-gray-500"
};

const SEVERITY_COLORS = {
  LOW: "bg-green-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-red-500"
};

export default function LLMLogsPage() {
  const { user, isAuthenticated } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);
  const [showFiltered, setShowFiltered] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const [filters, setFilters] = useState<EventFilters>({
    level: 'all',
    type: 'all',
    severity: 'all'
  });

  // Load initial events
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    loadEvents();
  }, [isAuthenticated, user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user || isPaused) return;

    const cleanup = subscribeLogs(user.id, {
      onEventInsert: (row) => {
        addEventRowIfVisible(row);
      },
      onEventUpdate: (row) => {
        updateEventRowIfVisible(row);
      },
      onRunInsert: (row) => {
        // Could add run creation notifications here
        console.log('New run created:', row.id);
      }
    });

    return cleanup;
  }, [isAuthenticated, user, isPaused, filters]);

  const loadEvents = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const query = (supabase as any)
        .from('events')
        .select('*')
        .eq('owner', user.id)
        .order('ts', { ascending: false })
        .limit(500);

      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to load events:', error);
        toast({
          title: "Failed to load events",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEventRowIfVisible = (row: EventRow) => {
    const passesFilters = checkEventPassesFilters(row);
    
    if (passesFilters || showFiltered) {
      setEvents(prev => {
        // Mark as new for animation
        const newRow = { ...row, isNew: true };
        
        // Remove animation flag after a short delay
        setTimeout(() => {
          setEvents(current => 
            current.map(e => e.id === row.id ? { ...e, isNew: false } : e)
          );
        }, 2000);
        
        return [newRow, ...prev];
      });
    } else {
      // Increment filtered counter
      setFilteredCount(prev => prev + 1);
    }
  };

  const updateEventRowIfVisible = (row: EventRow) => {
    setEvents(prev => 
      prev.map(e => e.id === row.id ? { ...row, isNew: e.isNew } : e)
    );
  };

  const checkEventPassesFilters = (event: EventRow): boolean => {
    if (filters.level && filters.level !== 'all' && event.level !== filters.level) return false;
    if (filters.type && filters.type !== 'all' && !event.type.includes(filters.type)) return false;
    if (filters.severity && filters.severity !== 'all' && event.severity !== filters.severity) return false;
    if (filters.runId && event.run_id !== filters.runId) return false;
    if (filters.search) {
      const searchText = [
        event.type,
        event.level,
        event.severity,
        JSON.stringify(event.meta),
        ...(event.tags || [])
      ].join(' ').toLowerCase();
      if (!searchText.includes(filters.search.toLowerCase())) return false;
    }
    return true;
  };

  const filteredEvents = useMemo(() => {
    if (showFiltered) return events;
    return events.filter(checkEventPassesFilters);
  }, [events, filters, showFiltered]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(events.map(e => e.type));
    return Array.from(types).sort();
  }, [events]);

  const uniqueRunIds = useMemo(() => {
    const runIds = new Set(events.map(e => e.run_id).filter(Boolean));
    return Array.from(runIds).sort();
  }, [events]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    setIsLive(!isPaused);
    
    if (isPaused) {
      toast({
        title: "Live updates resumed",
        description: "New events will appear automatically"
      });
    } else {
      toast({
        title: "Live updates paused", 
        description: "Click Resume to continue receiving updates"
      });
    }
  };

  const showAllFiltered = () => {
    setShowFiltered(true);
    setFilteredCount(0);
    toast({
      title: "Showing all events",
      description: "Filters temporarily expanded"
    });
  };

  const clearFilters = () => {
    setFilters({
      level: 'all',
      type: 'all', 
      severity: 'all'
    });
    setShowFiltered(false);
    setFilteredCount(0);
  };

  const formatTimestamp = (ts: string) => {
    return format(new Date(ts), 'HH:mm:ss.SSS');
  };

  const getEventRowClassName = (event: EventRow) => {
    let className = "transition-all duration-500";
    if (event.isNew) {
      className += " bg-primary/10 animate-pulse";
    }
    return className;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Unified Log Viewer</h1>
          <p className="text-muted-foreground">Please sign in to view your event logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Unified Log Viewer</h1>
          <p className="text-muted-foreground">Live view of runs, turns, LLM calls, and safety events</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Status Badge */}
          <Badge variant={isLive && !isPaused ? "default" : "secondary"} className="flex items-center gap-1">
            <Radio className={`w-3 h-3 ${isLive && !isPaused ? 'text-green-400' : 'text-gray-400'}`} />
            {isPaused ? 'Paused' : isLive ? 'Live' : 'Disconnected'}
          </Badge>

          {/* Filtered Events Badge */}
          {filteredCount > 0 && (
            <Badge variant="outline" className="cursor-pointer" onClick={showAllFiltered}>
              +{filteredCount} filtered
            </Badge>
          )}

          {/* Controls */}
          <Button variant="outline" size="sm" onClick={togglePause}>
            {isPaused ? <Radio className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>

          <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input
                placeholder="Search events..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Level</Label>
              <Select value={filters.level || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="DEBUG">DEBUG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={filters.type || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Severity</Label>
              <Select value={filters.severity || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Run ID</Label>
              <Select value={filters.runId || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, runId: value === 'all' ? undefined : value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Runs</SelectItem>
                  {uniqueRunIds.map(runId => (
                    <SelectItem key={runId} value={runId}>{runId?.substring(0, 8)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Events ({filteredEvents.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="autoscroll" className="text-sm">Auto-scroll</Label>
              <Switch
                id="autoscroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Time</TableHead>
                  <TableHead className="w-[80px]">Level</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[80px]">Severity</TableHead>
                  <TableHead className="w-[100px]">Run</TableHead>
                  <TableHead className="w-[60px]">Turn</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead className="w-[80px]">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {loading ? "Loading events..." : "No events found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id} className={getEventRowClassName(event)}>
                      <TableCell className="font-mono text-xs">
                        {formatTimestamp(event.ts)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-white ${LEVEL_COLORS[event.level] || 'bg-gray-500'}`}>
                          {event.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.type}
                      </TableCell>
                      <TableCell>
                        {event.severity && (
                          <Badge variant="outline" className={`text-white ${SEVERITY_COLORS[event.severity] || 'bg-gray-500'}`}>
                            {event.severity}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.run_id && (
                          <span title={event.run_id}>
                            {event.run_id.substring(0, 8)}...
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.turn_index !== null && event.turn_index !== undefined && (
                          <Badge variant="secondary">{event.turn_index}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {event.meta && (
                          <div className="truncate text-xs text-muted-foreground">
                            {JSON.stringify(event.meta).substring(0, 100)}
                            {JSON.stringify(event.meta).length > 100 && '...'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.tags && event.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {event.tags.slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {event.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{event.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Scroll to Latest Button */}
      {!autoScroll && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => {
              setAutoScroll(true);
              // Scroll to top of table
              document.querySelector('[data-radix-scroll-area-viewport]')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="shadow-lg"
          >
            <ArrowDown className="w-4 h-4 mr-2" />
            Scroll to Latest
          </Button>
        </div>
      )}
    </div>
  );
}