import { useState } from "react";
import { Link } from "react-router-dom";
import { User, LogOut, RefreshCw, Database, Github, Mail, Key, UserCheck, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useDevAutoLogin } from "@/hooks/useDevAutoLogin";
import { supabase } from "@/integrations/supabase/client";

export function UserMenu() {
  const { user, loading, signIn, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  const { guestMode, toggleGuestMode } = useGuestMode();
  const { devAutoLoginUsed } = useDevAutoLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleEmailPasswordSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Email and password required",
        description: "Please enter both email and password.",
      });
      return;
    }

    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      setModalOpen(false);
      setEmail("");
      setPassword("");
    }
    setSigningIn(false);
  };

  const handleEmailPasswordSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        variant: "destructive",
        title: "Email and password required",
        description: "Please enter both email and password.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setSigningIn(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your registration.",
      });
      setModalOpen(false);
      setEmail("");
      setPassword("");
    }
    setSigningIn(false);
  };

  const handleMagicLinkSignIn = async () => {
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter your email address.",
      });
      return;
    }

    setSigningIn(true);
    const { error } = await signIn(email.trim());
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a magic link to sign in.",
      });
      setModalOpen(false);
      setEmail("");
    }
    setSigningIn(false);
  };

  const handleGitHubSignIn = async () => {
    setSigningIn(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl
      }
    });
    
    if (error) {
      toast({
        variant: "destructive",
        title: "GitHub sign in failed",
        description: error.message,
      });
    }
    setSigningIn(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    }
  };

  const handleRefreshSession = async () => {
    setRefreshing(true);
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      toast({
        variant: "destructive",
        title: "Refresh failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Session refreshed",
        description: "Your session has been refreshed.",
      });
    }
    setRefreshing(false);
  };

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  if (loading) {
    return <Button variant="ghost" size="sm" disabled>Loading...</Button>;
  }

  if (!user && !guestMode) {
    return (
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <User className="h-4 w-4 mr-2" />
            Sign in
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to your account</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="email-password" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email-password">Email/Password</TabsTrigger>
              <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              <TabsTrigger value="guest">Guest Mode</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email-password" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEmailPasswordSignIn();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleEmailPasswordSignIn} 
                    disabled={signingIn}
                    className="flex-1"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    {signingIn ? "Signing in..." : "Sign In"}
                  </Button>
                  <Button 
                    onClick={handleEmailPasswordSignUp} 
                    disabled={signingIn}
                    variant="outline"
                    className="flex-1"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {signingIn ? "Signing up..." : "Sign Up"}
                  </Button>
                </div>
              </div>
              
              {/* One-Click Demo Login stub */}
              <div className="border-t pt-4">
                <Button 
                  disabled
                  variant="secondary"
                  className="w-full opacity-50 cursor-not-allowed"
                  title="Enable in staging only; requires server function to mint a session"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  One-Click Demo (Edge Function)
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Demo login requires server-side implementation for security
                </p>
              </div>
            </TabsContent>

            <TabsContent value="magic-link" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleMagicLinkSignIn();
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleMagicLinkSignIn} 
                disabled={signingIn}
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                {signingIn ? "Sending..." : "Send Magic Link"}
              </Button>
            </TabsContent>

            <TabsContent value="guest" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Guest Mode (Local Only)</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the app locally without signing in. Your data will be stored in your browser only.
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    toggleGuestMode();
                    setModalOpen(false);
                    toast({
                      title: "Guest mode enabled",
                      description: "Using local storage for all data.",
                    });
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <User className="h-4 w-4 mr-2" />
                  Continue as Guest (Local Only)
                </Button>
              </div>
            </TabsContent>
            
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs">
              {getInitials(user.email || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium truncate max-w-32">
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-32">
              {user.email}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/supabase-validate" className="flex items-center w-full">
            <Database className="h-4 w-4 mr-2" />
            Supabase Validate
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleRefreshSession}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Session"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            toggleGuestMode();
            toast({
              title: guestMode ? "Guest mode disabled" : "Guest mode enabled",
              description: guestMode ? "Back to Supabase data" : "Using local storage only",
            });
          }}
        >
          <User className="h-4 w-4 mr-2" />
          Guest Mode: {guestMode ? "On" : "Off"}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Guest mode UI
  if (guestMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-muted">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-sm font-medium">Guest User</span>
              <span className="text-xs text-muted-foreground">Local Only</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              toggleGuestMode();
              toast({
                title: "Guest mode disabled",
                description: "You can now sign in to sync your data.",
              });
            }}
          >
            <User className="h-4 w-4 mr-2" />
            Disable Guest Mode
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}