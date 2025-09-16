import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { Clock, User, FileText, Play, CheckCircle, XCircle, Filter, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useGuestMode } from "@/hooks/useGuestMode";
import { getRelationshipTypeLabel, getRelationshipTypeOptions } from "@/types/scenario";
import { useScenariosStore } from "@/store/scenarios";
import { useViewsStore } from "@/store/viewsStore";

interface RunRecord {
  id: string;
  scenario_id: string | null;
  profile_id: string | null;
  story_mode: boolean;
  max_turns: number;
  started_at: string;
  finished_at: string | null;
  turn_count?: number;
  scenario?: {
    name: string;
    relationshipType: string | null;
  };
}

export default function ConversationsPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("all");
  const { user } = useSupabaseAuth();
  const { guestMode, toggleGuestMode } = useGuestMode();
  const { scenarios } = useScenariosStore();
  const { savedViews, addView, applyView } = useViewsStore();

  useEffect(() => {
    if (!user && !guestMode) {
      setLoading(false);
      return;
    }

    async function fetchRuns() {
      try {
        if (guestMode) {
          // In guest mode, show empty state since we don't have local run storage yet
          setRuns([]);
          setLoading(false);
          return;
        }

        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch runs with turn counts and scenario data
        const { data: runsData, error } = await (supabase as any)
          .from('runs')
          .select(`
            id,
            scenario_id,
            profile_id,
            story_mode,
            max_turns,
            started_at,
            finished_at,
            turns(count)
          `)
          .eq('owner', user.id)
          .order('started_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const runsWithCounts = runsData?.map((run: any) => {
          const scenario = scenarios.find(s => s.id === run.scenario_id);
          return {
            ...run,
            turn_count: run.turns?.[0]?.count || 0,
            scenario: scenario ? {
              name: scenario.name,
              relationshipType: scenario.relationshipType
            } : null
          };
        }) || [];

        setRuns(runsWithCounts);
      } catch (error) {
        console.error('Failed to fetch runs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRuns();
  }, [user, guestMode, scenarios]);

  if (!user && !guestMode) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your conversation history, or continue as a guest to use local storage.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => window.dispatchEvent(new CustomEvent('openUserMenu'))}>
              Sign In
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                toggleGuestMode();
                window.location.reload();
              }}
            >
              Continue as Guest (Local Only)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Filter runs based on search and relationship filter
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      const matchesSearch = !searchQuery || 
        (run.scenario?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (run.profile_id?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRelationship = relationshipFilter === "all" || 
        run.scenario?.relationshipType === relationshipFilter ||
        (relationshipFilter === "unset" && !run.scenario?.relationshipType);
      
      return matchesSearch && matchesRelationship;
    });
  }, [runs, searchQuery, relationshipFilter]);

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Conversations</h1>
            <p className="text-muted-foreground">
              Your recent conversation runs and test sessions
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search scenarios, profiles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Label>Relationship Type</Label>
                <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Relationships</SelectItem>
                    <SelectItem value="unset">— (unset)</SelectItem>
                    {getRelationshipTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </header>

      {filteredRuns.length === 0 ? (
        runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {guestMode ? "No local conversations yet" : "No conversations yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {guestMode 
                ? "Start your first test run to store conversations locally in your browser."
                : "Start your first test run to see conversations here."
              }
            </p>
            <Button asChild>
              <Link to="/run">
                <Play className="h-4 w-4 mr-2" />
                Start a Run
              </Link>
            </Button>
          </CardContent>
        </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Filter className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No matching conversations</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {run.scenario?.name || run.scenario_id || "Untitled Scenario"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {run.finished_at ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Incomplete
                      </Badge>
                    )}
                    {run.story_mode && (
                      <Badge variant="outline">Story Mode</Badge>
                    )}
                    <Badge variant="secondary" className="gap-1">
                      <Heart className="h-3 w-3" />
                      {run.scenario?.relationshipType 
                        ? getRelationshipTypeLabel(run.scenario.relationshipType as any)
                        : "—"
                      }
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {run.profile_id && (
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{run.profile_id}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(run.started_at))} ago
                      </span>
                    </div>
                    <span>
                      {run.turn_count || 0} / {run.max_turns} turns
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      Started: {new Date(run.started_at).toLocaleString()}
                      {run.finished_at && (
                        <span className="ml-4">
                          Finished: {new Date(run.finished_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/results/${run.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}