import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff, Database, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from 'sonner';

interface RealtimeEvent {
  id: string;
  timestamp: number;
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  old?: any;
  new?: any;
}

interface ConnectionStatus {
  table: string;
  status: 'connected' | 'disconnected' | 'error';
  channel?: any;
}

function RealtimeCheckContent() {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testData, setTestData] = useState({
    profileName: '',
    scenarioName: '',
    scenarioDescription: '',
    eventType: '',
    eventPayload: ''
  });
  const { user, isAuthenticated } = useSupabaseAuth();

  const TABLES = ['userai_profiles', 'scenarios', 'runs', 'turns', 'events'];

  const addEvent = (table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
    const event: RealtimeEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      table,
      eventType,
      old: payload.old_record,
      new: payload.new_record
    };
    setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
  };

  const connectToRealtime = async () => {
    if (!isAuthenticated) {
      toast.error('Please authenticate to test realtime');
      return;
    }

    setIsConnecting(true);
    
    // Disconnect existing channels
    connections.forEach(conn => {
      if (conn.channel) {
        supabase.removeChannel(conn.channel);
      }
    });

    const newConnections: ConnectionStatus[] = [];

    for (const table of TABLES) {
      try {
        const channel = supabase
          .channel(`realtime-${table}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table
            },
            (payload) => {
              console.log(`Realtime event on ${table}:`, payload);
              addEvent(table, payload.eventType as any, payload);
              const recordId = (payload.new as any)?.id || (payload.old as any)?.id || 'unknown';
              toast.success(`${payload.eventType} on ${table}`, {
                description: `Row ${recordId}`
              });
            }
          )
          .subscribe((status) => {
            console.log(`Channel ${table} status:`, status);
            setConnections(prev => prev.map(conn => 
              conn.table === table 
                ? { ...conn, status: status === 'SUBSCRIBED' ? 'connected' : 'error' }
                : conn
            ));
          });

        newConnections.push({
          table,
          status: 'disconnected',
          channel
        });
      } catch (error) {
        console.error(`Error connecting to ${table}:`, error);
        newConnections.push({
          table,
          status: 'error'
        });
      }
    }

    setConnections(newConnections);
    setIsConnecting(false);
    toast.success('Realtime connections established');
  };

  const disconnectRealtime = () => {
    connections.forEach(conn => {
      if (conn.channel) {
        supabase.removeChannel(conn.channel);
      }
    });
    setConnections([]);
    toast.info('Realtime connections closed');
  };

  const insertTestProfile = async () => {
    if (!testData.profileName.trim()) {
      toast.error('Profile name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('userai_profiles')
        .insert({
          owner: user?.id,
          name: testData.profileName,
          description: 'Test profile for realtime',
          lang: 'en'
        });

      if (error) throw error;
      setTestData(prev => ({ ...prev, profileName: '' }));
      toast.success('Test profile created');
    } catch (error: any) {
      toast.error(`Failed to create profile: ${error.message}`);
    }
  };

  const insertTestScenario = async () => {
    if (!testData.scenarioName.trim()) {
      toast.error('Scenario name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('scenarios')
        .insert({
          owner: user?.id,
          name: testData.scenarioName,
          description: testData.scenarioDescription || 'Test scenario for realtime'
        });

      if (error) throw error;
      setTestData(prev => ({ ...prev, scenarioName: '', scenarioDescription: '' }));
      toast.success('Test scenario created');
    } catch (error: any) {
      toast.error(`Failed to create scenario: ${error.message}`);
    }
  };

  const insertTestEvent = async () => {
    if (!testData.eventType.trim()) {
      toast.error('Event type is required');
      return;
    }

    try {
      // First create a test run
      const { data: runData, error: runError } = await supabase
        .from('runs')
        .insert({
          owner: user?.id,
          status: 'pending'
        })
        .select()
        .single();

      if (runError) throw runError;

      // Then create the event
      const { error } = await supabase
        .from('events')
        .insert({
          run_id: runData.id,
          event_type: testData.eventType,
          payload: testData.eventPayload ? JSON.parse(testData.eventPayload) : {}
        });

      if (error) throw error;
      setTestData(prev => ({ ...prev, eventType: '', eventPayload: '' }));
      toast.success('Test event created');
    } catch (error: any) {
      toast.error(`Failed to create event: ${error.message}`);
    }
  };

  const clearEvents = () => {
    setEvents([]);
    toast.info('Event log cleared');
  };

  useEffect(() => {
    return () => {
      // Cleanup connections on unmount
      connections.forEach(conn => {
        if (conn.channel) {
          supabase.removeChannel(conn.channel);
        }
      });
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default' as const,
      disconnected: 'secondary' as const,
      error: 'destructive' as const
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'INSERT':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">
              Please sign in to test realtime functionality. Realtime subscriptions require authentication to work properly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wifi className="h-8 w-8 text-primary" />
          Realtime Check
        </h1>
        <p className="text-muted-foreground mt-1">
          Test Supabase realtime subscriptions and live data updates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Connection Status</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={connectToRealtime} 
                disabled={isConnecting || connections.length > 0}
                size="sm"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </Button>
              {connections.length > 0 && (
                <Button 
                  onClick={disconnectRealtime}
                  variant="outline"
                  size="sm"
                >
                  Disconnect
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TABLES.map((table) => {
                const connection = connections.find(c => c.table === table);
                const status = connection?.status || 'disconnected';
                
                return (
                  <div key={table} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="font-medium">{table}</span>
                    </div>
                    {getStatusBadge(status)}
                  </div>
                );
              })}
              
              {connections.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No active connections
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Test Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profiles" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profiles">Profiles</TabsTrigger>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profiles" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Profile Name</Label>
                  <Input
                    id="profile-name"
                    value={testData.profileName}
                    onChange={(e) => setTestData(prev => ({ ...prev, profileName: e.target.value }))}
                    placeholder="Test Profile"
                  />
                </div>
                <Button onClick={insertTestProfile} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test Profile
                </Button>
              </TabsContent>
              
              <TabsContent value="scenarios" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    value={testData.scenarioName}
                    onChange={(e) => setTestData(prev => ({ ...prev, scenarioName: e.target.value }))}
                    placeholder="Test Scenario"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario-desc">Description</Label>
                  <Textarea
                    id="scenario-desc"
                    value={testData.scenarioDescription}
                    onChange={(e) => setTestData(prev => ({ ...prev, scenarioDescription: e.target.value }))}
                    placeholder="Scenario description"
                  />
                </div>
                <Button onClick={insertTestScenario} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test Scenario
                </Button>
              </TabsContent>
              
              <TabsContent value="events" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-type">Event Type</Label>
                  <Input
                    id="event-type"
                    value={testData.eventType}
                    onChange={(e) => setTestData(prev => ({ ...prev, eventType: e.target.value }))}
                    placeholder="test_event"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-payload">Payload (JSON)</Label>
                  <Textarea
                    id="event-payload"
                    value={testData.eventPayload}
                    onChange={(e) => setTestData(prev => ({ ...prev, eventPayload: e.target.value }))}
                    placeholder='{"key": "value"}'
                  />
                </div>
                <Button onClick={insertTestEvent} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test Event
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Live Events */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Live Events</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">
              {events.length} events
            </Badge>
            {events.length > 0 && (
              <Button onClick={clearEvents} variant="outline" size="sm">
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.eventType)}
                      <span className="font-medium">{event.table}</span>
                      <Badge variant="secondary">{event.eventType}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                  
                  {(event.new || event.old) && (
                    <div className="text-sm">
                      {event.new && (
                        <div className="mb-1">
                          <span className="font-medium text-green-600">New:</span>
                          <code className="ml-2 text-xs bg-muted px-1 rounded">
                            {JSON.stringify(event.new, null, 2)}
                          </code>
                        </div>
                      )}
                      {event.old && (
                        <div>
                          <span className="font-medium text-red-600">Old:</span>
                          <code className="ml-2 text-xs bg-muted px-1 rounded">
                            {JSON.stringify(event.old, null, 2)}
                          </code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No events yet. Create some test data or modify existing records to see live updates.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RealtimeCheckPage() {
  return (
    <ErrorBoundary
      componentName="RealtimeCheckPage"
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="border-red-200 bg-red-50 border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              Realtime Check Failed to Load
            </h1>
            <p className="text-red-700 mb-4">
              The realtime test page encountered an error.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      <RealtimeCheckContent />
    </ErrorBoundary>
  );
}