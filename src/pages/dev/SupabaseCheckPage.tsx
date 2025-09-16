import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, Database, Wifi, User, Zap, ExternalLink } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { testRealtimeConnection } from '@/lib/realtime';

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
  const { user, isAuthenticated } = useSupabaseAuth();

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
        addResult('Connection Test', 'FAIL', `Connection failed: ${error}`, 'Verify SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY');
      }

      // 2. Schema Validation
      addResult('Schema Validation', 'RUNNING', 'Checking database schema...');
      
      const foundTables: string[] = [];
      const missingTablesList: string[] = [];

      for (const tableInfo of REQUIRED_TABLES) {
        try {
          // Use fetch directly to avoid TypeScript issues with empty schema
          const response = await fetch(
            `https://rxufqnsliggxavpfckft.supabase.co/rest/v1/${tableInfo.table}?select=*&limit=1`,
            {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWZxbnNsaWdneGF2cGZja2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5Njk1MzAsImV4cCI6MjA3MzU0NTUzMH0.Fq2--k7MY5MWy_E9_VEg-0p573TLzvufT8Ux0JD-6Pw',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWZxbnNsaWdneGF2cGZja2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5Njk1MzAsImV4cCI6MjA3MzU0NTUzMH0.Fq2--k7MY5MWy_E9_VEg-0p573TLzvufT8Ux0JD-6Pw'}`,
                'Content-Type': 'application/json',
                'Accept-Profile': 'public'
              }
            }
          );

          if (response.status === 404) {
            const errorData = await response.json();
            if (errorData.code === 'PGRST205') {
              // Table not found
              missingTablesList.push(tableInfo.table);
            } else {
              addResult(`Table: ${tableInfo.table}`, 'FAIL', `Not found: ${errorData.message}`, 'Create the missing table');
            }
          } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            addResult(`Table: ${tableInfo.table}`, 'WARNING', `Access error: ${errorData.message}`, 'Check RLS policies and permissions');
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

      // 4. Realtime Test
      if (user) {
        addResult('Realtime Test', 'RUNNING', 'Testing realtime connectivity...');
        
        try {
          const realtimeWorking = await testRealtimeConnection(user.id);
          
          if (realtimeWorking) {
            addResult('Realtime Test', 'PASS', 'Realtime connection working correctly');
          } else {
            addResult('Realtime Test', 'FAIL', 'Realtime connection failed', 'Check realtime configuration and RLS policies');
          }
        } catch (error) {
          addResult('Realtime Test', 'FAIL', `Realtime test error: ${error}`, 'Ensure events table exists with proper RLS');
        }
      } else {
        addResult('Realtime Test', 'WARNING', 'Skipped (requires authentication)', 'Sign in to test realtime functionality');
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

  const createMissingTables = () => {
    window.open('/supabase-sql', '_blank');
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
                  <a href="/dev/express-check" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Express Check
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
                    <div className="mt-2 ml-6 p-2 bg-blue-50 rounded text-xs text-blue-800">
                      <strong>Suggestion:</strong> {result.suggestion}
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
                https://rxufqnsliggxavpfckft.supabase.co
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