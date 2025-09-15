import { useState } from "react";
import { Link } from "react-router-dom";
import { User, LogOut, RefreshCw, Database, Github, Mail } from "lucide-react";
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
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function UserMenu() {
  const { user, loading, signIn, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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

  if (!user) {
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
          
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              <TabsTrigger value="github">GitHub</TabsTrigger>
            </TabsList>
            
            <TabsContent value="magic-link" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
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
            
            <TabsContent value="github" className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Sign in with your GitHub account
              </p>
              <Button 
                onClick={handleGitHubSignIn} 
                disabled={signingIn}
                className="w-full"
                variant="outline"
              >
                <Github className="h-4 w-4 mr-2" />
                {signingIn ? "Signing in..." : "Continue with GitHub"}
              </Button>
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
        
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}