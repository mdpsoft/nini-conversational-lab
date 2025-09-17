import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, Wifi, Play, Wrench, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { runRealtimeSmokeTest, ensureRealtimePublication } from '@/utils/realtimeSmoke';
import { toast } from 'sonner';

interface DiagnosticResult {
  name: string;
  status: 'IDLE' | 'RUNNING' | 'PASS' | 'FAIL';
  details: string;
  error?: string;
  timestamp?: Date;
}

interface LogEntry {
  timestamp: Date;
  stage: string;
  message: string;
  level: 'info' | 'error' | 'warn';
}

interface DiagnosticInfo {
  supabaseUrl: string;
  anonKey: string;
  projectRef: string;
  realtimeUrl: string;
  authUser: string | null;
  logs: LogEntry[];
}

function RealtimeDebugContent() {
  const [results, setResults] = useState<DiagnosticResult[]>([
    { name: 'WebSocket Handshake', status: 'IDLE', details: 'Waiting to start...' },
    { name: 'Channel Subscribe', status: 'IDLE', details: 'Waiting to start...' },
    { name: 'Round-trip Event', status: 'IDLE', details: 'Waiting to start...' },
    { name: 'Broadcast Validation', status: 'IDLE', details: 'Waiting to start...' }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [configValidation, setConfigValidation] = useState<any>(null);
  const [latestSmokeResult, setLatestSmokeResult] = useState<any>(null);
  const { user, isAuthenticated } = useSupabaseAuth();
  const channelRef = useRef<any>(null);

  const addLog = (stage: string, message: string, level: 'info' | 'error' | 'warn' = 'info') => {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      stage,
      message,
      level
    };
    setLogs(prev => [...prev.slice(-19), logEntry]); // Keep last 20 logs
    console.log(`[${logEntry.timestamp.toISOString()}] ${stage}: ${message}`);
  };

  const updateResult = (index: number, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, ...updates, timestamp: new Date() } : result
    ));
  };

  const resetResults = () => {
    setResults([
      { name: 'WebSocket Handshake', status: 'IDLE', details: 'Waiting to start...' },
      { name: 'Channel Subscribe', status: 'IDLE', details: 'Waiting to start...' },
      { name: 'Round-trip Event', status: 'IDLE', details: 'Waiting to start...' },
      { name: 'Broadcast Validation', status: 'IDLE', details: 'Waiting to start...' }
    ]);
    setLogs([]);
  };

  const validateConfiguration = () => {
    // Get configuration from supabase client without exposing secrets
    const supabaseUrl = (supabase as any)?.supabaseUrl ?? '(config hidden)';
    
    // Extract project ref from URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
    const expectedRealtimeUrl = projectRef !== 'unknown' ? `wss://${projectRef}.supabase.co/realtime/v1` : '(hidden)';
    
    // Never expose keys in UI - always mask
    const maskedKey = '(hidden)';
    
    const validation = {
      supabaseUrl,
      anonKey: maskedKey,
      projectRef,
      realtimeUrl: expectedRealtimeUrl,
      authUser: user?.email || 'Not authenticated',
      urlValid: supabaseUrl.includes('.supabase.co'),
      keyPresent: true // We assume it's present since client is configured
    };
    
    setConfigValidation(validation);
    addLog('CONFIG', `Project: ${projectRef}, Auth: ${validation.authUser}`);
    return validation;
  };

  const runDiagnostics = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to run realtime diagnostics');
      return;
    }

    setIsRunning(true);
    resetResults();
    validateConfiguration();

    try {
      // Check for SafeBoot or Circuit Breaker
      const isRealtimeDisabled = localStorage.getItem('realtimeDisabled') === 'true';
      const isSafeBoot = localStorage.getItem('safe-boot') === 'true';
      
      if (isRealtimeDisabled || isSafeBoot) {
        addLog('WARNING', `Realtime disabled by ${isSafeBoot ? 'SafeBoot' : 'Circuit Breaker'}`, 'warn');
      }

      addLog('TEST', 'Starting comprehensive realtime diagnostics...');
      
      // Run the shared smoke test
      const smokeResult = await runRealtimeSmokeTest(supabase);
      setLatestSmokeResult(smokeResult);
      
      // Update results based on smoke test
      updateResult(0, { 
        status: smokeResult.handshake, 
        details: smokeResult.handshake === 'PASS' ? '✓ WebSocket connected successfully' : '❌ WebSocket connection failed',
        error: smokeResult.handshake === 'FAIL' ? smokeResult.error : undefined
      });
      
      updateResult(1, { 
        status: smokeResult.subscribe, 
        details: smokeResult.subscribe === 'PASS' ? '✓ Broadcast channel subscribed' : '❌ Channel subscription failed',
        error: smokeResult.subscribe === 'FAIL' ? smokeResult.error : undefined
      });
      
      updateResult(2, { 
        status: smokeResult.roundtrip, 
        details: smokeResult.roundtrip === 'PASS' ? '✓ Broadcast round-trip successful' : '❌ Broadcast event failed',
        error: smokeResult.roundtrip === 'FAIL' ? smokeResult.error : undefined
      });
      
      updateResult(3, { 
        status: smokeResult.publication, 
        details: smokeResult.publication === 'PASS' ? '✓ supabase_realtime publication exists' : '⚠️ Publication missing or misconfigured',
        error: smokeResult.publication === 'FAIL' ? 'supabase_realtime publication not found' : undefined
      });

      // Add detailed logs
      addLog('HANDSHAKE', smokeResult.handshake === 'PASS' ? 'WebSocket connection successful' : 'WebSocket connection failed');
      addLog('SUBSCRIBE', smokeResult.subscribe === 'PASS' ? `Broadcast channel subscription successful (${smokeResult.subscribeMode || 'with_ack'})` : 'Broadcast channel subscription failed');
      addLog('ROUNDTRIP', smokeResult.roundtrip === 'PASS' ? 
        `Broadcast round-trip successful (mode: ${smokeResult.finalMode || 'with_ack'}, sendResult: ${smokeResult.sendResult || 'ok'})` : 
        `Broadcast round-trip failed (mode: ${smokeResult.finalMode || 'with_ack'}, sendResult: ${smokeResult.sendResult || 'unknown'})`);
      addLog('PUBLICATION', smokeResult.publication === 'PASS' ? 'supabase_realtime publication found' : 'supabase_realtime publication missing');
      
      if (smokeResult.ok && smokeResult.publication === 'PASS') {
        addLog('SUCCESS', 'All realtime diagnostics passed!');
        toast.success('Realtime diagnostics completed successfully');
      } else if (smokeResult.ok && smokeResult.publication === 'FAIL') {
        addLog('WARNING', 'Core realtime works but publication needs attention');
        toast.success('Realtime diagnostics mostly successful - publication can be auto-fixed');
      } else {
        addLog('ERROR', smokeResult.error || 'One or more tests failed');
        toast.error('Realtime diagnostics failed - check logs for details');
      }

    } catch (error: any) {
      addLog('ERROR', `Diagnostic error: ${error.message || error}`, 'error');
      
      // Mark all as failed
      updateResult(0, { status: 'FAIL', details: '❌ Test failed', error: error.message });
      updateResult(1, { status: 'FAIL', details: '❌ Test failed', error: error.message });
      updateResult(2, { status: 'FAIL', details: '❌ Test failed', error: error.message });
      updateResult(3, { status: 'FAIL', details: '❌ Test failed', error: error.message });
      
      toast.error('Diagnostic test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const autoFixBroadcast = async () => {
    setIsFixing(true);
    try {
      addLog('AUTOFIX', 'Configuring supabase_realtime publication...');
      const result = await ensureRealtimePublication(supabase);
      
      if (result.success) {
        const details = result.details;
        addLog('AUTOFIX', `Publication configured successfully! Added ${details?.added_tables || 0} tables, ensured ${details?.ensured_identity || 0} replica identities.`);
        toast.success(`Broadcast publication configured! ${details?.message || 'Setup complete.'}`);
        
        // Update the publication result
        updateResult(3, { 
          status: 'PASS', 
          details: '✓ supabase_realtime publication configured'
        });
        
        // Re-run diagnostics after a brief delay
        setTimeout(() => {
          addLog('AUTOFIX', 'Re-running diagnostics to verify configuration...');
          runDiagnostics();
        }, 1000);
      } else {
        addLog('AUTOFIX', `Failed to configure publication: ${result.error}`, 'error');
        toast.error(`Auto-fix failed: ${result.error}`);
      }
    } catch (error: any) {
      addLog('AUTOFIX', `Auto-fix error: ${error.message}`, 'error');
      toast.error('Auto-fix failed');
    } finally {
      setIsFixing(false);
    }
  };

  const copyDiagnostics = async () => {
    const diagnosticInfo: DiagnosticInfo = {
      supabaseUrl: configValidation?.supabaseUrl || 'unknown',
      anonKey: configValidation?.anonKey || 'unknown',
      projectRef: configValidation?.projectRef || 'unknown',
      realtimeUrl: configValidation?.realtimeUrl || 'unknown',
      authUser: configValidation?.authUser || 'unknown',
      logs: logs.slice(-20) // Last 20 logs
    };

    const diagnosticJson = JSON.stringify({
      timestamp: new Date().toISOString(),
      config: diagnosticInfo,
      results: results,
      summary: {
        handshake: results[0]?.status,
        subscribe: results[1]?.status,
        roundtrip: results[2]?.status,
        publication: results[3]?.status,
        subscribeMode: latestSmokeResult?.subscribeMode || 'with_ack',
        finalMode: latestSmokeResult?.finalMode || 'with_ack',
        sendResult: latestSmokeResult?.sendResult || 'unknown',
        publicationPresent: results[3]?.status === 'PASS',
        lastFixResult: results[3]?.status === 'PASS' ? 'success' : 'pending'
      }
    }, null, 2);

    try {
      await navigator.clipboard.writeText(diagnosticJson);
      toast.success('Diagnostics copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy diagnostics');
    }
  };

  const autoFixRealtime = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to run auto-fix');
      return;
    }

    setIsFixing(true);
    toast.info('Running realtime auto-fix...');

    try {
      // Use our comprehensive RPC function to ensure publication is properly configured
      const result = await ensureRealtimePublication(supabase);
      
      if (result.success) {
        const details = result.details;
        addLog('AUTOFIX', `Configuration complete: ${details?.message || 'Success'}`);
        toast.success('Auto-fix completed! Please run diagnostics again to verify.');
        
        // Auto-run diagnostics after fix
        setTimeout(() => {
          runDiagnostics();
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to configure publication');
      }

    } catch (error: any) {
      console.error('Auto-fix error:', error);
      toast.error(`Auto-fix failed: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    // Validate configuration on mount
    validateConfiguration();
    
    return () => {
      // Cleanup channel on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RUNNING':
        return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'IDLE':
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      PASS: 'default',
      FAIL: 'destructive',
      RUNNING: 'secondary',
      IDLE: 'outline'
    } as const;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const failedTests = results.filter(r => r.status === 'FAIL').length;
  const passedTests = results.filter(r => r.status === 'PASS').length;

  const isSafeBoot = localStorage.getItem('safe-boot') === 'true';
  const isRealtimeDisabled = localStorage.getItem('realtimeDisabled') === 'true';

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
            <p className="text-yellow-700 mb-4">
              Please sign in to run realtime diagnostics. Realtime subscriptions require authentication to work properly.
            </p>
            <Button asChild>
              <a href="/auth">Sign In</a>
            </Button>
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
          Realtime Client Debugger
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive realtime diagnostics: WebSocket handshake → channel subscribe → round-trip events
        </p>
      </div>

      {/* Configuration Validation */}
      {configValidation && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-medium">Configuration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Supabase URL:</strong>
                <code className="ml-2 bg-muted px-1 rounded text-xs">
                  {configValidation.supabaseUrl}
                </code>
              </div>
              <div>
                <strong>Project Ref:</strong>
                <span className="ml-2 font-mono">{configValidation.projectRef}</span>
              </div>
              <div>
                <strong>Anon Key:</strong>
                <code className="ml-2 bg-muted px-1 rounded text-xs">
                  {configValidation.anonKey}
                </code>
              </div>
              <div>
                <strong>Auth User:</strong>
                <span className="ml-2">{configValidation.authUser}</span>
              </div>
              <div>
                <strong>Realtime URL:</strong>
                <code className="ml-2 bg-muted px-1 rounded text-xs">
                  {configValidation.realtimeUrl}
                </code>
              </div>
              <div>
                <strong>Status:</strong>
                <span className={`ml-2 ${configValidation.urlValid && configValidation.keyPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {configValidation.urlValid && configValidation.keyPresent ? '✓ Valid' : '❌ Invalid'}
                </span>
              </div>
            </div>
            
            {(isSafeBoot || isRealtimeDisabled) && (
              <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-200 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {isSafeBoot ? 'SafeBoot Mode Active' : 'Realtime Disabled by Circuit Breaker'}
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Realtime functionality may be limited. Tests can still be run to diagnose issues.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Summary */}
      {(failedTests > 0 || passedTests > 0) && (
        <Card className={`mb-6 ${failedTests > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className={failedTests > 0 ? 'text-red-800' : 'text-green-800'}>
                <strong>
                  {failedTests > 0 ? 'Issues Detected' : 'All Tests Passed'}
                </strong>
                <p className="text-sm mt-1">
                  {passedTests} passed, {failedTests} failed
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{passedTests} passed</Badge>
                {failedTests > 0 && <Badge variant="destructive">{failedTests} failed</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky Actions Bar */}
      <Card className="mb-6 sticky top-4 z-10 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button 
                onClick={runDiagnostics} 
                disabled={isRunning || isFixing}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Running Full Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Full Test
                  </>
                )}
              </Button>
              
              <Button 
                onClick={copyDiagnostics}
                disabled={isRunning}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Diagnostics
              </Button>
              
              {/* Auto-Fix Broadcast Button */}
              {results[3]?.status === 'FAIL' && (
                <Button 
                  onClick={autoFixBroadcast}
                  disabled={isRunning || isFixing}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isFixing ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4" />
                      Auto-Fix Broadcast
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={autoFixBroadcast}
                disabled={isRunning || isFixing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isFixing ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4" />
                    Auto-Fix Broadcast
                  </>
                )}
              </Button>
            </div>
            
            <Button asChild variant="ghost" size="sm">
              <a href="/dev/supabase-check" className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3" />
                Supabase Check
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-mono text-muted-foreground">
                        {index + 1}.
                      </div>
                      {getStatusIcon(result.status)}
                      <div>
                        <h3 className="font-medium">{result.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {result.details}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result.status)}
                      {result.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {result.error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-200">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {result.error}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Log Viewer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center justify-between">
              <span>Live Logs</span>
              <Badge variant="outline">{logs.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`p-2 rounded ${
                      log.level === 'error' ? 'bg-red-50 text-red-800' :
                      log.level === 'warn' ? 'bg-yellow-50 text-yellow-800' :
                      'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="font-semibold min-w-[80px]">
                        [{log.stage}]
                      </span>
                      <span className="break-all">
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))}
                
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No logs yet. Run a test to see detailed output.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Fix Guide */}
      {failedTests > 0 && (
        <Card className="mt-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base font-medium text-orange-800">Auto-Fix Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {results[0]?.status === 'FAIL' && (
                <div className="p-3 bg-red-50 rounded border-l-4 border-red-200">
                  <strong className="text-red-800">WebSocket Handshake Failed:</strong>
                  <ul className="mt-1 text-red-700 list-disc list-inside">
                    <li>Check network connectivity and firewall settings</li>
                    <li>Verify SUPABASE_URL is correct</li>
                    <li>Ensure WebSocket connections are allowed</li>
                    <li><a href="/dev/supabase-check" className="underline">Run Supabase Check</a> for detailed diagnostics</li>
                  </ul>
                </div>
              )}
              
              {results[1]?.status === 'FAIL' && (
                <div className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-200">
                  <strong className="text-yellow-800">Channel Subscribe Failed:</strong>
                  <ul className="mt-1 text-yellow-700 list-disc list-inside">
                    <li>Check if realtime publication is configured</li>
                    <li>Verify RLS policies allow channel access</li>
                    <li>Use the Auto-Fix button to configure realtime</li>
                  </ul>
                </div>
              )}
              
              {results[2]?.status === 'FAIL' && (
                <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-200">
                  <strong className="text-blue-800">Round-trip Event Failed:</strong>
                  <ul className="mt-1 text-blue-700 list-disc list-inside">
                    <li>Broadcast events may not be working</li>
                    <li>Try testing with <a href="/dev/realtime-check" className="underline">Realtime Check</a></li>
                    <li>Check browser console for additional errors</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RealtimeDebugPage() {
  return (
    <ErrorBoundary
      componentName="RealtimeDebugPage"
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="border-red-200 bg-red-50 border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              Realtime Debug Failed to Load
            </h1>
            <p className="text-red-700 mb-4">
              The realtime debug page encountered an error.
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
      <RealtimeDebugContent />
    </ErrorBoundary>
  );
}