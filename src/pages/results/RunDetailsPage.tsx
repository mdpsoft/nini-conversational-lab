import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Clock, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { subscribeLogs } from "@/lib/realtime";

interface RunDetails {
  id: string;
  scenario_id: string | null;
  profile_id: string | null;
  story_mode: boolean;
  max_turns: number;
  started_at: string;
  finished_at: string | null;
  turns: Array<{
    id: number;
    turn_index: number;
    speaker: string;
    text: string;
    created_at: string;
  }>;
}

export default function RunDetailsPage() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<RunDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSupabaseAuth();

  useEffect(() => {
    if (!user || !runId) {
      setLoading(false);
      return;
    }

    async function fetchRunDetails() {
      try {
        const { data: runData, error: runError } = await (supabase as any)
          .from('runs')
          .select(`
            id,
            scenario_id,
            profile_id,
            story_mode,
            max_turns,
            started_at,
            finished_at,
            turns (
              id,
              turn_index,
              speaker,
              text,
              created_at
            )
          `)
          .eq('id', runId)
          .eq('owner', user.id)
          .single();

        if (runError) throw runError;

        if (!runData) {
          setError("Run not found or access denied");
          return;
        }

        // Sort turns by turn_index
        const sortedTurns = runData.turns?.sort((a: any, b: any) => a.turn_index - b.turn_index) || [];
        
        setRun({
          ...runData,
          turns: sortedTurns
        });
      } catch (error) {
        console.error('Failed to fetch run details:', error);
        setError("Failed to load run details");
      } finally {
        setLoading(false);
      }
    }

    fetchRunDetails();

    // Subscribe to real-time updates for this specific run
    const unsubscribe = subscribeLogs(user.id, {
      onTurnInsert: async (turn) => {
        if (turn.run_id === runId) {
          // Add the new turn to the current run
          setRun(prev => {
            if (!prev) return prev;
            const newTurns = [...prev.turns, turn].sort((a, b) => a.turn_index - b.turn_index);
            return { ...prev, turns: newTurns };
          });
        }
      },
      onRunInsert: (newRun) => {
        if (newRun.id === runId) {
          setRun(prev => prev ? { ...prev, ...newRun } : null);
        }
      }
    });

    return unsubscribe;
  }, [user, runId]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Sign in Required</h1>
          <p className="text-muted-foreground">
            Please sign in to view run details.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p>Loading run details...</p>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error || "Run not found"}</p>
          <Button asChild>
            <Link to="/results">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Conversations
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/results">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversations
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {run.scenario_id || "Untitled Scenario"}
            </h1>
            <p className="text-muted-foreground">
              Run ID: {run.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {run.finished_at ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                In Progress
              </Badge>
            )}
            {run.story_mode && (
              <Badge variant="outline">Story Mode</Badge>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Run Details Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Run Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {run.profile_id && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{run.profile_id}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {new Date(run.started_at).toLocaleString()}
                </span>
              </div>
              {run.finished_at && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {new Date(run.finished_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">
                  {run.turns.length} / {run.max_turns} turns
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation Transcript */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              {run.turns.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No turns recorded yet
                </p>
              ) : (
                <div className="space-y-4">
                  {run.turns.map((turn) => (
                    <div
                      key={turn.id}
                      className={`p-4 rounded-lg ${
                        turn.speaker === 'Nini'
                          ? 'bg-primary/5 border-l-4 border-primary'
                          : 'bg-secondary/5 border-l-4 border-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={turn.speaker === 'Nini' ? 'default' : 'secondary'}>
                          {turn.speaker}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Turn {turn.turn_index + 1} • {new Date(turn.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{turn.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}