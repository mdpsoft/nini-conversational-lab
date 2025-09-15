import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSettingsStore } from "@/store/settings";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { CheckCircle, XCircle, AlertTriangle, Settings, Key, Database, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function EnvironmentPage() {
  const { apiKey, xmlSystemSpec } = useSettingsStore();
  const { user, session } = useSupabaseAuth();
  const [envChecks, setEnvChecks] = useState({
    apiKey: false,
    systemSpec: false,
    supabaseAuth: false,
    supabaseConnection: false,
  });

  useEffect(() => {
    // Check environment status
    setEnvChecks({
      apiKey: !!apiKey,
      systemSpec: !!xmlSystemSpec,
      supabaseAuth: !!user && !!session,
      supabaseConnection: !!user, // Simple check, could be more sophisticated
    });
  }, [apiKey, xmlSystemSpec, user, session]);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "secondary" : "destructive"}>
        {status ? "Connected" : "Not Configured"}
      </Badge>
    );
  };

  const allConfigured = Object.values(envChecks).every(Boolean);

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Environment & API Keys</h1>
        <p className="text-muted-foreground">
          Manage your API keys and environment configuration
        </p>
      </header>

      {/* Overall Status */}
      <Alert className={`mb-6 ${allConfigured ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {allConfigured ? (
            <span className="text-green-800">
              ✅ All services configured and ready to use.
            </span>
          ) : (
            <span className="text-yellow-800">
              ⚠️ Some services need configuration. Complete setup below.
            </span>
          )}
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* OpenAI API Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                OpenAI API Key
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(envChecks.apiKey)}
                {getStatusBadge(envChecks.apiKey)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Required for LLM inference and conversation generation.
              </p>
              {envChecks.apiKey ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">API key is configured and encrypted</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">No API key configured</span>
                </div>
              )}
              <Button asChild variant="outline">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure API Key
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Specification */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                System Specification
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(envChecks.systemSpec)}
                {getStatusBadge(envChecks.systemSpec)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                XML system specification for conversation context and behavior.
              </p>
              {envChecks.systemSpec ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">System spec is configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">No system specification set</span>
                </div>
              )}
              <Button asChild variant="outline">
                <Link to="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure System Spec
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Supabase Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Supabase Authentication
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(envChecks.supabaseAuth)}
                {getStatusBadge(envChecks.supabaseAuth)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Required for data persistence, real-time updates, and user management.
              </p>
              {envChecks.supabaseAuth ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Signed in as: {user?.email}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    User ID: {user?.id}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Not authenticated with Supabase</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/supabase-validate">
                    <Database className="h-4 w-4 mr-2" />
                    Validate Setup
                  </Link>
                </Button>
                {!envChecks.supabaseAuth && (
                  <Button asChild>
                    <Link to="/settings">
                      Sign In
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">Main Settings</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/supabase-validate">Validate Database</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/supabase-sql">Database Setup</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/llm-logs">Test Logging</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}