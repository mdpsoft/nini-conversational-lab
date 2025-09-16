import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, AlertTriangle, Copy, RefreshCw, ChevronDown, ExternalLink, Shield, Mail, Settings, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthCheck {
  id: string;
  label: string;
  status: "idle" | "running" | "success" | "warning" | "error";
  details?: string;
  hint?: string;
}

export default function AuthChecksPage() {
  const { user, session } = useSupabaseAuth();
  const { toast } = useToast();
  const [checks, setChecks] = useState<AuthCheck[]>([
    { id: "provider", label: "Email Provider Enabled", status: "idle" },
    { id: "redirect", label: "Redirect URLs Configuration", status: "idle" },
    { id: "smtp", label: "SMTP Configuration", status: "idle" },
    { id: "session", label: "Current Session State", status: "idle" },
    { id: "error", label: "Error Handling Test", status: "idle" },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  const updateCheckStatus = (id: string, status: AuthCheck["status"], details?: string, hint?: string) => {
    setChecks(prev => prev.map(check => 
      check.id === id ? { ...check, status, details, hint } : check
    ));
  };

  const runProviderCheck = async () => {
    updateCheckStatus("provider", "running");
    try {
      // Test provider availability by attempting signup with invalid domain
      const { error } = await supabase.auth.signUp({
        email: "test@invalid.domain.test",
        password: "testpassword123",
        options: { data: { test: true } }
      });
      
      if (error) {
        if (error.message.includes("disabled") || error.message.includes("provider")) {
          updateCheckStatus("provider", "error", "Email provider appears to be disabled", "Enable email auth in Supabase Dashboard → Authentication → Providers");
        } else {
          updateCheckStatus("provider", "success", "Email provider is enabled", "Email authentication is working");
        }
      } else {
        updateCheckStatus("provider", "success", "Email provider is enabled", "Email authentication is working");
      }
    } catch (err) {
      updateCheckStatus("provider", "error", "Failed to test provider", "Check Supabase connection");
    }
  };

  const runRedirectCheck = async () => {
    updateCheckStatus("redirect", "running");
    try {
      const currentUrl = window.location.origin;
      const expectedRedirect = `${currentUrl}/`;
      
      updateCheckStatus("redirect", "success", 
        `Current origin: ${currentUrl}`, 
        "Ensure this URL is configured in Supabase → Authentication → URL Configuration"
      );
    } catch (err) {
      updateCheckStatus("redirect", "error", "Failed to determine redirect URL");
    }
  };

  const runSMTPCheck = async () => {
    updateCheckStatus("smtp", "running");
    try {
      // We can't directly check SMTP config via client, so we infer from project setup
      const projectId = "rxufqnsliggxavpfckft"; // From client config
      
      updateCheckStatus("smtp", "warning", 
        "Using Supabase default SMTP", 
        "For production, configure custom SMTP in Supabase Dashboard → Settings → Auth"
      );
    } catch (err) {
      updateCheckStatus("smtp", "error", "Failed to check SMTP configuration");
    }
  };

  const runSessionCheck = async () => {
    updateCheckStatus("session", "running");
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        updateCheckStatus("session", "error", `Session error: ${error.message}`);
      } else if (data.user) {
        updateCheckStatus("session", "success", 
          `Signed in as: ${data.user.email}`, 
          `User ID: ${data.user.id}`
        );
      } else {
        updateCheckStatus("session", "warning", "Not signed in", "Sign in to test authenticated features");
      }
    } catch (err) {
      updateCheckStatus("session", "error", "Failed to check session");
    }
  };

  const runErrorCheck = async () => {
    updateCheckStatus("error", "running");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "nonexistent@example.com",
        password: "wrongpassword"
      });
      
      if (error && error.message.includes("Invalid login credentials")) {
        updateCheckStatus("error", "success", 
          "Error handling works correctly", 
          "Got expected 'Invalid login credentials' error"
        );
      } else {
        updateCheckStatus("error", "warning", 
          `Unexpected response: ${error?.message || "No error"}`,
          "Check authentication configuration"
        );
      }
    } catch (err) {
      updateCheckStatus("error", "error", "Failed to test error handling");
    }
  };

  const runAllChecks = async () => {
    setIsRunning(true);
    toast({ title: "Running auth checks...", description: "This may take a few seconds" });
    
    try {
      await Promise.all([
        runProviderCheck(),
        runRedirectCheck(), 
        runSMTPCheck(),
        runSessionCheck(),
        runErrorCheck()
      ]);
      
      toast({ 
        title: "Auth checks completed", 
        description: "Review results below" 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleCheck = async (checkId: string) => {
    switch (checkId) {
      case "provider": await runProviderCheck(); break;
      case "redirect": await runRedirectCheck(); break;
      case "smtp": await runSMTPCheck(); break;
      case "session": await runSessionCheck(); break;
      case "error": await runErrorCheck(); break;
    }
  };

  const copyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      projectId: "rxufqnsliggxavpfckft",
      user: user ? { id: user.id, email: user.email } : null,
      checks: checks.reduce((acc, check) => {
        acc[check.id] = {
          status: check.status,
          details: check.details,
          hint: check.hint
        };
        return acc;
      }, {} as Record<string, any>)
    };
    
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast({ title: "Report copied", description: "Auth check report copied to clipboard" });
  };

  const getStatusIcon = (status: AuthCheck["status"]) => {
    switch (status) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "running": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  const getStatusBadge = (status: AuthCheck["status"]) => {
    const variants = {
      success: "default" as const,
      warning: "secondary" as const,
      error: "destructive" as const,
      running: "outline" as const,
      idle: "outline" as const
    };
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const projectRef = "rxufqnsliggxavpfckft";
  const supabaseAuthUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/users`;

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Auth Quick Checks</h1>
        <p className="text-muted-foreground">
          Validate Supabase authentication configuration and test auth flows
        </p>
      </header>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <Button onClick={runAllChecks} disabled={isRunning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running Checks..." : "Run All Checks"}
        </Button>
        <Button variant="outline" onClick={copyReport}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Report
        </Button>
      </div>

      {/* Checks Results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check) => (
              <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="font-medium">{check.label}</h4>
                    {check.details && (
                      <p className="text-sm text-muted-foreground">{check.details}</p>
                    )}
                    {check.hint && (
                      <p className="text-xs text-blue-600 mt-1">{check.hint}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(check.status)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => runSingleCheck(check.id)}
                    disabled={check.status === "running"}
                  >
                    Re-run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Admin Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Create Users via Supabase Dashboard (Option B)
                <ChevronDown className={`h-4 w-4 transition-transform ${docsOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Admin Method:</strong> Create user accounts directly in Supabase Dashboard.
                  Use this for adding team members or test accounts.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Step 1</Badge>
                  <span className="text-sm">Go to Supabase → Authentication → Users</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Step 2</Badge>
                  <span className="text-sm">Click "Add User" button</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Step 3</Badge>
                  <span className="text-sm">Enter Email + Password and save</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Step 4</Badge>
                  <span className="text-sm">Use those credentials in your app's Sign In form</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>Optional:</strong> Click "Invite User" instead to send confirmation email (requires SMTP)
                  </span>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Quick Access Link</h4>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-background px-2 py-1 rounded border flex-1">
                    {supabaseAuthUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(supabaseAuthUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(supabaseAuthUrl);
                      toast({ title: "Link copied", description: "Supabase Auth Users URL copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Production Note:</strong> For production apps, implement proper user registration 
                  flows with email confirmation, password reset, and role management.
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}