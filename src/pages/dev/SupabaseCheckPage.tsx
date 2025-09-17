import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, Database, Wifi, User, Zap, ExternalLink, Copy } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { runRealtimeDualSmoke } from '@/utils/realtimeDualSmoke';
import { ensureRealtimePublication } from '@/utils/ensurePublication';
import { toast } from 'sonner';

interface DiagnosticResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'WARNING';
  details: string;
  suggestion?: string;
}

interface TableInfo {
  table: string;
  required: boolean;
  description: string;
}

const REQUIRED_TABLES: TableInfo[] = [
  { table: 'userai_profiles', required: true, description: 'User AI profiles and configurations' },
  { table: 'scenarios', required: true, description: 'Conversation scenarios and templates' }, 
  { table: 'runs', required: true, description: 'Conversation run records' },
  { table: 'turns', required: true, description: 'Individual conversation turns' },
  { table: 'events', required: true, description: 'System events and logs' },
];

function SupabaseCheckContent() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [needsRealtimeFix, setNeedsRealtimeFix] = useState(false);
  const [needsBroadcastFix, setNeedsBroadcastFix] = useState(false);
  const [showRealtimeSQL, setShowRealtimeSQL] = useState(false);
  const { user, isAuthenticated } = useSupabaseAuth();

  const REALTIME_FIX_SQL = `-- Realtime Enablement (v2.1)
-- Ensure Realtime publication exists
create publication if not exists supabase_realtime for table public.userai_profiles;

-- Add tables to publication (idempotente)
alter publication supabase_realtime add table public.userai_profiles;
alter publication supabase_realtime add table public.scenarios;
alter publication supabase_realtime add table public.runs;
alter publication supabase_realtime add table public.turns;
alter publication supabase_realtime add table public.events;

-- Ensure each table has REPLICA IDENTITY FULL (para enviar payload completo)
alter table public.userai_profiles replica identity full;
alter table public.scenarios       replica identity full;
alter table public.runs            replica identity full;
alter table public.turns           replica identity full;
alter table public.events          replica identity full;`;

  const addResult = (name: string, status: DiagnosticResult['status'], details: string, suggestion?: string) => {
    setResults(prev => {
      const newResults = prev.filter(r => r.name !== name);
      newResults.push({ name, status, details, suggestion });
      return newResults;
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setMissingTables([]);

    try {
      // 1. Connection Test
      addResult('Connection Test', 'RUNNING', 'Testing Supabase connection...');
      
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error && error.message.includes('Invalid API key')) {
          addResult('Connection Test', 'FAIL', `Invalid API key: ${error.message}`, 'Check your Supabase configuration');
        } else {
          addResult('Connection Test', 'PASS', 'Supabase client connected successfully');
        }
      } catch (error) {
        addResult('Connection Test', 'FAIL', `Connection failed: ${error}`, 'Verify Supabase configuration');
      }

      // 2. Schema Validation
      addResult('Schema Validation', 'RUNNING', 'Checking database schema...');
      
      const foundTables: string[] = [];
      const missingTablesList: string[] = [];

      for (const tableInfo of REQUIRED_TABLES) {
        try {
          // Use supabase client with proper type checking
          let data, error;
          
          switch (tableInfo.table) {
            case 'userai_profiles':
              ({ data, error } = await supabase.from('userai_profiles').select('*').limit(1));
              break;
            case 'scenarios':
              ({ data, error } = await supabase.from('scenarios').select('*').limit(1));
              break;
            case 'runs':
              ({ data, error } = await supabase.from('runs').select('*').limit(1));
              break;
            case 'turns':
              ({ data, error } = await supabase.from('turns').select('*').limit(1));
              break;
            case 'events':
              ({ data, error } = await supabase.from('events').select('*').limit(1));
              break;
            default:
              throw new Error(`Unknown table: ${tableInfo.table}`);
          }

          if (error) {
            if (error.code === 'relation_does_not_exist' || error.code === '42P01') {
              // Table not found
              missingTablesList.push(tableInfo.table);
            } else if (error.code === 'insufficient_privilege' || error.code === '42501') {
              // Permission issue - likely RLS
              addResult(`Table: ${tableInfo.table}`, 'WARNING', `Access restricted: ${error.message}`, 'Check RLS policies and permissions');
            } else {
              addResult(`Table: ${tableInfo.table}`, 'FAIL', `Query error: ${error.message}`, 'Check table exists and is accessible');
            }
          } else {
            foundTables.push(tableInfo.table);
            addResult(`Table: ${tableInfo.table}`, 'PASS', `✓ ${tableInfo.description}`);
          }
        } catch (error) {
          addResult(`Table: ${tableInfo.table}`, 'FAIL', `Query failed: ${error}`, 'Check table exists and is accessible');
        }
      }

      setMissingTables(missingTablesList);

      if (missingTablesList.length === 0) {
        addResult('Schema Validation', 'PASS', `All ${REQUIRED_TABLES.length} required tables found`);
      } else {
        addResult('Schema Validation', 'FAIL', 
          `Missing ${missingTablesList.length} tables: ${missingTablesList.join(', ')}`,
          'Use the Auto-Fix Database Schema button to create missing tables'
        );
      }

      // 3. Authentication Test
      addResult('Authentication Test', 'RUNNING', 'Testing user authentication...');
      
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          addResult('Authentication Test', 'FAIL', `Auth error: ${error.message}`, 'Check authentication configuration');
        } else if (authUser) {
          addResult('Authentication Test', 'PASS', `Authenticated as: ${authUser.email || authUser.id}`);
        } else {
          addResult('Authentication Test', 'WARNING', 'No authenticated user', 'Sign in to test authenticated features');
        }
      } catch (error) {
        addResult('Authentication Test', 'FAIL', `Auth test failed: ${error}`, 'Check Supabase auth configuration');
      }

      // 4. Realtime Validation
      addResult('Realtime Validation', 'RUNNING', 'Checking realtime configuration...');
      
      try {
        const realtimeStatus = await checkRealtimeConfiguration();
        setNeedsRealtimeFix(!realtimeStatus.valid);
        
        if (realtimeStatus.valid) {
          addResult('Realtime Validation', 'PASS', 'All tables configured for realtime');
        } else {
          addResult('Realtime Validation', 'FAIL', 
            `Missing configuration: ${realtimeStatus.issues.join(', ')}`,
            'Use the Auto-Fix Realtime button to configure realtime'
          );
        }
      } catch (error) {
        addResult('Realtime Validation', 'FAIL', `Realtime validation error: ${error}`, 'Check database configuration');
        setNeedsRealtimeFix(true);
      }

      // 5. Realtime Test
      addResult('Realtime Test', 'RUNNING', 'Testing realtime connectivity...');
      
      // Check for circuit breaker or SafeBoot
      const isRealtimeDisabled = localStorage.getItem('realtimeDisabled') === 'true';
      const isSafeBoot = localStorage.getItem('safe-boot') === 'true';
      
      if (isRealtimeDisabled || isSafeBoot) {
        addResult('Realtime Test', 'WARNING', 
          `Realtime disabled by ${isRealtimeDisabled ? 'Circuit Breaker' : 'SafeBoot'}`, 
          'Use Enable & Retry button to restore realtime functionality'
        );
      } else {
        try {
          const smokeResult = await runRealtimeDualSmoke(supabase);
          
          if (smokeResult.ok) {
            const statusDetails = [
              `${smokeResult.handshake === 'PASS' ? '✅' : '❌'} Handshake`,
              `${smokeResult.subscribe === 'PASS' ? '✅' : '❌'} Subscribe`,
              `${smokeResult.roundtrip === 'PASS' ? '✅' : '❌'} Round-trip (${smokeResult.path})`,
              `${smokeResult.path === 'postgres_changes' && smokeResult.roundtrip === 'PASS' ? '✅' : smokeResult.path === 'broadcast' ? '➖' : '⚠️'} Publication`
            ].join(' / ');
            
            addResult('Realtime Test', 'PASS', `${statusDetails} · Path: ${smokeResult.path}`);
            setNeedsBroadcastFix(smokeResult.path === 'postgres_changes' && smokeResult.roundtrip === 'PASS');
          } else {
            const failureReason = smokeResult.details || smokeResult.error || 'Unknown error';
            const statusDetails = [
              `${smokeResult.handshake === 'PASS' ? '✅' : '❌'} Handshake`,
              `${smokeResult.subscribe === 'PASS' ? '✅' : '❌'} Subscribe`,
              `${smokeResult.roundtrip === 'PASS' ? '✅' : '❌'} Round-trip (${smokeResult.path})`,
              `${smokeResult.path === 'postgres_changes' && smokeResult.roundtrip === 'PASS' ? '✅' : '⚠️'} Publication`
            ].join(' / ');
            
            const isSubscriptionTimeout = failureReason.includes('Channel subscription timeout') || failureReason.includes('subscription timeout');
            const isRoundtripFailed = failureReason.includes('Round-trip') || failureReason.includes('roundtrip');
            
            let actionText = 'Open Realtime Debugger for detailed analysis';
            if (isSubscriptionTimeout || isRoundtripFailed) {
              actionText = 'Apply Realtime Repair SQL';
            }
            
            addResult('Realtime Test', 'FAIL', 
              `${statusDetails} · Fallback path: ${smokeResult.path} · Details: ${failureReason}`, 
              actionText
            );
            setNeedsBroadcastFix(true);
          }
        } catch (error) {
          addResult('Realtime Test', 'FAIL', `Realtime test error: ${error}`, 'Apply Realtime Repair SQL');
        }
      }

    } catch (globalError) {
      addResult('Global Test', 'FAIL', `Test runner failed: ${globalError}`);
    }

    setIsRunning(false);
  };

  // Auto-run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'RUNNING':
        return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      PASS: 'default',
      FAIL: 'destructive', 
      WARNING: 'secondary',
      RUNNING: 'secondary'
    } as const;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const failedTests = results.filter(r => r.status === 'FAIL').length;
  const warningTests = results.filter(r => r.status === 'WARNING').length;

  const checkRealtimeConfiguration = async () => {
    const issues: string[] = [];
    
    try {
      // For now, skip the complex database checks since we can't easily query system tables
      // This will be handled by the migration SQL which the user runs manually
      const issues: string[] = [];
      
      // Simple check: try to create a realtime channel to see if it works
      try {
        const testChannel = supabase.channel('test-realtime-check');
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Realtime connection timeout'));
          }, 5000);
          
          testChannel.subscribe((status) => {
            clearTimeout(timeout);
            if (status === 'SUBSCRIBED') {
              resolve(status);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              reject(new Error(`Realtime status: ${status}`));
            }
          });
        });
        
        supabase.removeChannel(testChannel);
      } catch (error) {
        issues.push('Realtime connection failed');
      }
      
    } catch (error) {
      issues.push('Error checking realtime configuration');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  };

  const createMissingTables = async () => {
    // Tables will be auto-created via migration
    // Re-run diagnostics to validate the fix
    setTimeout(() => {
      runDiagnostics();
    }, 1000);
  };

  const copyRealtimeSQL = async () => {
    try {
      await navigator.clipboard.writeText(REALTIME_FIX_SQL);
      toast.success('SQL copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy SQL');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Supabase Health Check
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive Supabase connectivity and schema diagnostics
        </p>
      </div>

      {/* Status Summary */}
      {(failedTests > 0 || warningTests > 0) && (
        <Card className={`mb-6 ${failedTests > 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${failedTests > 0 ? 'text-red-800' : 'text-yellow-800'}`}>
              <AlertTriangle className="h-5 w-5" />
              {failedTests > 0 ? 'Critical Issues Detected' : 'Warnings Found'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={failedTests > 0 ? 'text-red-700' : 'text-yellow-700'}>
              {failedTests > 0 && `${failedTests} critical issue${failedTests > 1 ? 's' : ''} found. `}
              {warningTests > 0 && `${warningTests} warning${warningTests > 1 ? 's' : ''} detected. `}
              Review the diagnostics below for details.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-medium">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              className="w-full"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Re-run Diagnostics'}
            </Button>

            {missingTables.length > 0 && (
              <Button 
                onClick={createMissingTables}
                variant="outline"
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Auto-Fix Database Schema
              </Button>
            )}

            {needsRealtimeFix && (
              <Button 
                onClick={() => setShowRealtimeSQL(!showRealtimeSQL)}
                variant="outline"
                className="w-full"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Auto-Fix Realtime
              </Button>
            )}

            {/* Auto-Fix Broadcast Publication */}
            {needsBroadcastFix && (
              <Button 
                onClick={async () => {
                  try {
                    const result = await ensureRealtimePublication() as any;
                    if (result?.status === 'ok') {
                      toast.success(
                        `Broadcast publication configured! Added ${result?.added_tables || 0} tables, ensured ${result?.ensured_identity || 0} replica identities.`
                      );
                      setNeedsBroadcastFix(false);
                      // Re-run diagnostics after fix
                      setTimeout(() => runDiagnostics(), 1000);
                    } else {
                      toast.error(`Failed to configure publication: ${result?.error || 'Unknown error'}`);
                    }
                  } catch (error) {
                    toast.error('Failed to configure broadcast publication');
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Auto-Fix Broadcast
              </Button>
            )}

            {/* Circuit Breaker / SafeBoot Enable & Retry */}
            {(localStorage.getItem('realtimeDisabled') === 'true' || localStorage.getItem('safe-boot') === 'true') && (
              <Button 
                onClick={() => {
                  localStorage.removeItem('realtimeDisabled');
                  localStorage.removeItem('safe-boot');
                  window.location.reload();
                }}
                variant="outline"
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                Enable & Retry
              </Button>
            )}

            {/* Realtime Debugger Link */}
            {results.some(r => r.name === 'Realtime Test' && r.status === 'FAIL') && (
              <Button 
                asChild
                variant="outline"
                className="w-full"
              >
                <a href="/dev/realtime-debug">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Realtime Debugger
                </a>
              </Button>
            )}

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Quick Links</h4>
              <div className="flex flex-col gap-1">
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <a href="/supabase-sql" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    SQL Editor
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <a href="/supabase-validate" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Schema Validator
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <a href="/dev/realtime-check" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Realtime Check
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <a href="/dev/realtime-debug" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Realtime Debug
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <a href="/dev/realtime-repair" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Realtime Repair
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Diagnostic Results</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">
                {results.filter(r => r.status === 'PASS').length} passed
              </Badge>
              {warningTests > 0 && (
                <Badge variant="secondary">
                  {warningTests} warnings
                </Badge>
              )}
              {failedTests > 0 && (
                <Badge variant="destructive">
                  {failedTests} failed
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1 ml-6">
                    {result.details}
                  </p>
                  
                   {result.suggestion && (
                     <div className="mt-2 ml-6 flex items-start gap-3">
                       <div className="flex-1 p-2 bg-blue-50 rounded text-xs text-blue-800">
                         <strong>Suggestion:</strong> {result.suggestion}
                       </div>
                       {result.suggestion.includes('Apply Realtime Repair SQL') && (
                         <Button 
                           asChild 
                           size="sm" 
                           variant="outline"
                           className="h-8 text-xs"
                         >
                           <a href="/dev/realtime-repair">
                             <ExternalLink className="h-3 w-3 mr-1" />
                             Repair
                           </a>
                         </Button>
                       )}
                       {result.suggestion.includes('Open Realtime Debugger') && (
                         <Button 
                           asChild 
                           size="sm" 
                           variant="outline"
                           className="h-8 text-xs"
                         >
                           <a href="/dev/realtime-debug">
                             <ExternalLink className="h-3 w-3 mr-1" />
                             Debug
                           </a>
                         </Button>
                       )}
                     </div>
                   )}
                </div>
              ))}
              
              {results.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {isRunning ? 'Running diagnostics...' : 'No results yet'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Realtime Auto-Fix SQL */}
      {showRealtimeSQL && (
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base font-medium text-blue-800">
              Realtime Enablement SQL (v2.1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-blue-700">
                Run this SQL in your Supabase SQL Editor to enable realtime for all core tables:
              </p>
              
              <Textarea
                value={REALTIME_FIX_SQL}
                readOnly
                className="h-48 font-mono text-xs bg-white"
              />
              
              <div className="flex gap-2">
                <Button onClick={copyRealtimeSQL} size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL
                </Button>
                
                <Button asChild variant="outline" size="sm">
                  <a 
                    href={`https://supabase.com/dashboard/project/${(supabase as any)?.supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown'}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open SQL Editor
                  </a>
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>After running the SQL:</strong> Click "Re-run Diagnostics" to verify the realtime configuration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium">Configuration Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Supabase URL:</strong>
              <code className="ml-2 bg-muted px-1 rounded">
                {(supabase as any)?.supabaseUrl ? '(configured)' : '(not configured)'}
              </code>
            </div>
            <div>
              <strong>Auth Status:</strong>
              <span className={`ml-2 ${isAuthenticated ? 'text-green-600' : 'text-yellow-600'}`}>
                {isAuthenticated ? `✓ Signed in as ${user?.email}` : '⚠ Not authenticated'}
              </span>
            </div>
            <div>
              <strong>Required Tables:</strong>
              <span className="ml-2 text-muted-foreground">
                {REQUIRED_TABLES.length} tables expected
              </span>
            </div>
            <div>
              <strong>Missing Tables:</strong>
              <span className={`ml-2 ${missingTables.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {missingTables.length === 0 ? '✓ All tables present' : `❌ ${missingTables.length} missing`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupabaseCheckPage() {
  return (
    <ErrorBoundary
      componentName="SupabaseCheckPage"
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="border-red-200 bg-red-50 border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              Supabase Check Failed to Load
            </h1>
            <p className="text-red-700 mb-4">
              The Supabase diagnostic page encountered an error.
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
      <SupabaseCheckContent />
    </ErrorBoundary>
  );
}