import { useState } from 'react';
import { User, LogIn, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';

export function SupabaseStatus() {
  const { user, loading, signIn, signOut, isAuthenticated } = useSupabaseAuth();
  const [email, setEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsSigningIn(true);
    const { error } = await signIn(email);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Magic link sent",
        description: "Check your email for the sign in link",
      });
      setEmail('');
    }
    
    setIsSigningIn(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          <User className="w-3 h-3 mr-1" />
          Loading...
        </Badge>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default">
          <User className="w-3 h-3 mr-1" />
          {user.email}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="w-4 h-4" />
          Supabase Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
            className="flex-1"
          />
          <Button
            onClick={handleSignIn}
            disabled={isSigningIn}
            size="sm"
          >
            {isSigningIn ? (
              <Mail className="h-4 w-4 animate-pulse" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign in with email magic link to sync profiles to Supabase
        </p>
      </CardContent>
    </Card>
  );
}