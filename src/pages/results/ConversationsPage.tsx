import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { Clock, User, FileText, Play, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useGuestMode } from "@/hooks/useGuestMode";

interface RunRecord {
  id: string;
  scenario_id: string | null;
  profile_id: string | null;
  story_mode: boolean;
  max_turns: number;
  started_at: string;
  finished_at: string | null;
  turn_count?: number;
}

export default function ConversationsPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSupabaseAuth();
  const { guestMode, toggleGuestMode } = useGuestMode();

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

        // Fetch runs with turn counts
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

        const runsWithCounts = runsData?.map((run: any) => ({
          ...run,
          turn_count: run.turns?.[0]?.count || 0
        })) || [];

        setRuns(runsWithCounts);
      } catch (error) {
        console.error('Failed to fetch runs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRuns();
  }, [user, guestMode]);

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

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Conversations</h1>
        <p className="text-muted-foreground">
          Your recent conversation runs and test sessions
        </p>
      </header>

      {runs.length === 0 ? (
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
        <div className="space-y-4">
          {runs.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {run.scenario_id || "Untitled Scenario"}
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