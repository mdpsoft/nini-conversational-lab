import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, Database, ExternalLink } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useDataSource } from '@/state/dataSource';
import { useProfilesRepo } from '@/hooks/useProfilesRepo';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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

function BlankTestPageContent() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
  const navigate = useNavigate();
  const { state: dataSourceState, setDataSource, getRepoHealth } = useDataSource();
  const { profiles, isRepoReady, error: profileError } = useProfilesRepo();
  const originalConsoleError = useRef<typeof console.error>();

  // Intercept console errors
  useEffect(() => {
    const startTime = Date.now();
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
      }, ...prev.slice(0, 9)]); // Keep last 10 errors
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
      // 1. Root React tree mounted
      const rootElement = document.getElementById('root');
      const hasChildren = rootElement && rootElement.children.length > 0;
      addResult(
        'Root React Tree',
        hasChildren ? 'PASS' : 'FAIL',
        hasChildren 
          ? `Root element exists with ${rootElement?.children.length} child(ren)`
          : 'Root element missing or empty'
      );

      // 2. Router resolving routes
      try {
        const currentPath = window.location.pathname;
        const validPaths = ['/', '/profiles', '/results', '/scenarios'];
        const isValidPath = validPaths.some(path => currentPath.startsWith(path)) || currentPath.startsWith('/dev');
        addResult(
          'Router Navigation',
          'PASS',
          `Current path: ${currentPath}, Router active`
        );
      } catch (error) {
        addResult('Router Navigation', 'FAIL', `Router error: ${error}`);
      }

      // 3. DataSourceContext available
      try {
        const hasDataSource = !!dataSourceState;
        addResult(
          'DataSource Context',
          hasDataSource ? 'PASS' : 'FAIL',
          hasDataSource 
            ? `DataSource: ${dataSourceState.source}${dataSourceState.reason ? ` (${dataSourceState.reason})` : ''}`
            : 'DataSource context not available'
        );
      } catch (error) {
        addResult('DataSource Context', 'FAIL', `Context error: ${error}`);
      }

      // 4. Profiles repository
      try {
        const repoStatus = isRepoReady ? 'Ready' : 'Loading';
        const profileCount = profiles?.length ?? 0;
        const hasError = !!profileError;
        
        addResult(
          'Profiles Repository',
          hasError ? 'FAIL' : 'PASS',
          hasError 
            ? `Error: ${profileError}`
            : `${repoStatus}, ${profileCount} profile(s) loaded`
        );
      } catch (error) {
        addResult('Profiles Repository', 'FAIL', `Repository error: ${error}`);
      }

      // 5. Supabase connectivity
      try {
        if (dataSourceState.source === 'supabase') {
          const { data, error } = await supabase.auth.getSession();
          const isConnected = !error;
          addResult(
            'Supabase Connectivity',
            isConnected ? 'PASS' : 'FAIL',
            isConnected 
              ? `Connected, Session: ${data.session ? 'Active' : 'None'}`
              : `Connection failed: ${error?.message}`
          );
        } else {
          addResult('Supabase Connectivity', 'PASS', 'Not using Supabase data source');
        }
      } catch (error) {
        addResult('Supabase Connectivity', 'FAIL', `Supabase error: ${error}`);
      }

      // 6. LocalStorage test
      try {
        const testKey = 'diagnostic_test_key';
        const testValue = 'test_value_' + Date.now();
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        addResult(
          'LocalStorage Access',
          retrieved === testValue ? 'PASS' : 'FAIL',
          retrieved === testValue 
            ? 'Read/write operations successful'
            : 'Failed to read/write to localStorage'
        );
      } catch (error) {
        addResult('LocalStorage Access', 'FAIL', `LocalStorage error: ${error}`);
      }

      // 7. Recent console errors
      const recentErrors = consoleErrors.filter(e => Date.now() - e.timestamp < 5000);
      addResult(
        'Console Errors (5s)',
        recentErrors.length === 0 ? 'PASS' : 'FAIL',
        recentErrors.length === 0 
          ? 'No recent console errors'
          : `${recentErrors.length} error(s) in last 5 seconds`
      );

    } catch (globalError) {
      addResult('Global Test Runner', 'FAIL', `Test runner failed: ${globalError}`);
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

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variant = status === 'PASS' ? 'default' : status === 'FAIL' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const failedTests = results.filter(r => r.status === 'FAIL').length;
  const allTestsFailed = results.length > 0 && failedTests === results.length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          🔍 Blank Screen Diagnostic Running
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive app health check to identify rendering issues
        </p>
      </div>

      {/* Critical failure banner */}
      {allTestsFailed && (
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Root App Failed to Mount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              All diagnostic tests failed. The app may have critical issues preventing normal rendering.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dev/error-log')}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Check Error Log
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reload App
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control buttons */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          size="sm"
        >
          <RotateCcw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
          Re-run Tests
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await setDataSource(dataSourceState.source === 'supabase' ? 'local' : 'supabase');
            } catch (error) {
              console.error('Failed to switch data source:', error);
            }
          }}
        >
          <Database className="h-4 w-4 mr-2" />
          Switch Data Source
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dev/error-log')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Error Log
        </Button>
      </div>

      {/* Results table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Diagnostic Results
            <div className="flex gap-2">
              <Badge variant="outline">
                {results.filter(r => r.status === 'PASS').length} passed
              </Badge>
              <Badge variant="destructive">
                {failedTests} failed
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    {result.name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(result.status)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {result.details}
                  </TableCell>
                </TableRow>
              ))}
              {results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {isRunning ? 'Running diagnostics...' : 'No results yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent console errors */}
      {consoleErrors.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Recent Console Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {consoleErrors.map((error, index) => (
                <div key={index} className="text-xs bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-red-800 font-mono">
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

export default function BlankTestPage() {
  return (
    <ErrorBoundary
      componentName="BlankTestPage"
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="border-red-200 bg-red-50 border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">
              🔍 Diagnostic Page Failed to Load
            </h1>
            <p className="text-red-700 mb-4">
              Even the diagnostic page encountered an error. This indicates a critical system failure.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/dev/error-log'}
                className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50"
              >
                Check Error Log
              </button>
            </div>
          </div>
        </div>
      }
    >
      <BlankTestPageContent />
    </ErrorBoundary>
  );
}