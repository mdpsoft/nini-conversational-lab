import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, Database, Zap, Shield, Activity } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useDataSource } from '@/state/dataSource';
import { useProfilesRepo } from '@/hooks/useProfilesRepo';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'RUNNING';
  details: string;
}

interface ConsoleError {
  timestamp: number;
  message: string;
  stack?: string;
}

function ExpressCheckContent() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
  const { state: dataSourceState, setDataSource } = useDataSource();
  const { profiles, isRepoReady, error: profileError } = useProfilesRepo();
  const originalConsoleError = useRef<typeof console.error>();

  // Intercept console errors
  useEffect(() => {
    originalConsoleError.current = console.error;
    
    console.error = (...args: any[]) => {
      originalConsoleError.current?.(...args);
      
      const errorMsg = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      setConsoleErrors(prev => [{
        timestamp: Date.now(),
        message: errorMsg,
        stack: args[0]?.stack
      }, ...prev.slice(0, 4)]); // Keep last 5 errors
    };

    return () => {
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
    };
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const newResults: DiagnosticResult[] = [];

    // Helper to add result
    const addResult = (name: string, status: 'PASS' | 'FAIL', details: string) => {
      newResults.push({ name, status, details });
      setResults([...newResults]);
    };

    try {
      // 1. Boot marker check
      const bootMarker = document.getElementById('boot-mounted');
      const hasBootMarker = bootMarker && bootMarker.getAttribute('data-ok') === 'true';
      addResult(
        'Boot Marker',
        hasBootMarker ? 'PASS' : 'FAIL',
        hasBootMarker ? 'Boot marker present and OK' : 'Boot marker missing or not OK'
      );

      // 2. Root React tree
      const rootElement = document.getElementById('root');
      const hasChildren = rootElement && rootElement.children.length > 0;
      addResult(
        'React Tree',
        hasChildren ? 'PASS' : 'FAIL',
        hasChildren ? `Root has ${rootElement?.children.length} child(ren)` : 'Root empty or missing'
      );

      // 3. DataSource context
      const hasDataSource = !!dataSourceState;
      addResult(
        'DataSource',
        hasDataSource ? 'PASS' : 'FAIL',
        hasDataSource ? `${dataSourceState.source}` : 'Context not available'
      );

      // 4. Profiles repository
      const hasError = !!profileError;
      addResult(
        'Profiles Repo',
        hasError ? 'FAIL' : 'PASS',
        hasError ? `Error: ${profileError}` : `${profiles?.length ?? 0} profile(s)`
      );

      // 5. Supabase connectivity (if using Supabase)
      if (dataSourceState.source === 'supabase') {
        try {
          const { data, error } = await supabase.auth.getSession();
          addResult(
            'Supabase',
            !error ? 'PASS' : 'FAIL',
            !error ? `Session: ${data.session ? 'Active' : 'None'}` : `Error: ${error?.message}`
          );
        } catch (error) {
          addResult('Supabase', 'FAIL', `Connection failed: ${error}`);
        }
      } else {
        addResult('Supabase', 'PASS', 'Not using Supabase');
      }

      // 6. LocalStorage test
      try {
        const testKey = 'express_check_test';
        const testValue = 'test_' + Date.now();
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        addResult(
          'LocalStorage',
          retrieved === testValue ? 'PASS' : 'FAIL',
          retrieved === testValue ? 'Read/write OK' : 'Failed to read/write'
        );
      } catch (error) {
        addResult('LocalStorage', 'FAIL', `Error: ${error}`);
      }

      // 7. Recent console errors
      const recentErrors = consoleErrors.filter(e => Date.now() - e.timestamp < 10000);
      addResult(
        'Console Errors',
        recentErrors.length === 0 ? 'PASS' : 'FAIL',
        recentErrors.length === 0 ? 'No recent errors' : `${recentErrors.length} error(s) in 10s`
      );

    } catch (globalError) {
      addResult('Test Runner', 'FAIL', `Failed: ${globalError}`);
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
      case 'RUNNING':
        return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  // SafeBoot and Realtime status
  const isSafeBoot = localStorage.getItem('safe-boot') === 'true';
  const isRealtimeDisabled = localStorage.getItem('realtimeDisabled') === 'true';
  const failedTests = results.filter(r => r.status === 'FAIL').length;

  const disableSafeBootAndReload = () => {
    localStorage.removeItem('safe-boot');
    localStorage.removeItem('realtimeDisabled');
    window.location.reload();
  };

  const switchDataSource = async () => {
    try {
      const newSource = dataSourceState.source === 'supabase' ? 'local' : 'supabase';
      await setDataSource(newSource);
    } catch (error) {
      console.error('Failed to switch data source:', error);
    }
  };

  const toggleRealtime = () => {
    if (isRealtimeDisabled) {
      localStorage.removeItem('realtimeDisabled');
    } else {
      localStorage.setItem('realtimeDisabled', 'true');
    }
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Express Check
        </h1>
        <p className="text-muted-foreground mt-1">
          Quick system health overview and first aid controls
        </p>
      </div>

      {/* Critical Status Banner */}
      {failedTests > 0 && (
        <Card className="border-orange-200 bg-orange-50 mb-6">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {failedTests} Failed Check{failedTests > 1 ? 's' : ''} Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700">
              Some system components may need attention. Check the diagnostics below.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blank Test Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">System Diagnostics</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runDiagnostics} 
              disabled={isRunning}
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="text-sm font-medium">{result.name}</span>
                  </div>
                  <Badge variant={result.status === 'PASS' ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
              {results.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  {isRunning ? 'Running diagnostics...' : 'No results yet'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* UI Smoke Indicator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">UI Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div 
                data-testid="ui-smoke" 
                className="px-3 py-2 text-sm bg-muted rounded-md border flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
                UI OK · {dataSourceState.source} · Realtime {isRealtimeDisabled ? 'Off' : 'On'}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span>Data: {dataSourceState.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  <span>RT: {isRealtimeDisabled ? 'Off' : 'On'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3" />
                  <span>SafeBoot: {isSafeBoot ? 'On' : 'Off'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  <span>Tests: {results.filter(r => r.status === 'PASS').length}/{results.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* First Aid Controls */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-5 w-5" />
            First Aid Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Data Source</h4>
              <p className="text-xs text-muted-foreground">Current: {dataSourceState.source}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={switchDataSource}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Switch to {dataSourceState.source === 'supabase' ? 'Local' : 'Supabase'}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Realtime</h4>
              <p className="text-xs text-muted-foreground">Status: {isRealtimeDisabled ? 'Disabled' : 'Enabled'}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleRealtime}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isRealtimeDisabled ? 'Enable' : 'Disable'} Realtime
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">SafeBoot</h4>
              <p className="text-xs text-muted-foreground">Mode: {isSafeBoot ? 'Protected' : 'Normal'}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={disableSafeBootAndReload}
                disabled={!isSafeBoot && !isRealtimeDisabled}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                Reset SafeBoot & Reload
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href="/dev/supabase-check">Supabase Health</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/dev/realtime-check">Realtime Check</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/dev/express-check">Express Check</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/dev/error-log">Error Log</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/supabase-validate">Supabase Validator</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Console Errors (if any) */}
      {consoleErrors.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Recent Console Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {consoleErrors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-red-800 font-mono truncate">
                    {error.message}
                  </div>
                  <div className="text-red-600 text-xs mt-1">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ExpressCheckPage() {
  return (
    <ErrorBoundary
      componentName="ExpressCheckPage"
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="border-red-200 bg-red-50 border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              Express Check Failed to Load
            </h1>
            <p className="text-red-700 mb-4">
              The Express Check page encountered an error.
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
      <ExpressCheckContent />
    </ErrorBoundary>
  );
}