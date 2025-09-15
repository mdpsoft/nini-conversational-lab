import { useState } from 'react';
import { Copy, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SQL_SCHEMA = `create extension if not exists pgcrypto;

create table if not exists public.userai_profiles (
  id text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  lang text default 'es',
  tone text not null,
  traits text[] default '{}',
  attachment_style text,
  conflict_style text,
  emotions_focus text[] default '{}',
  needs_focus text[] default '{}',
  boundaries_focus text[] default '{}',
  verbosity jsonb,
  question_rate jsonb,
  example_lines text[] default '{}',
  safety jsonb,
  beat_bias jsonb,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.userai_profiles enable row level security;
drop policy if exists "profiles_rw_owner" on public.userai_profiles;
create policy "profiles_rw_owner" on public.userai_profiles
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create index if not exists idx_profiles_owner_updated
  on public.userai_profiles(owner, updated_at desc);`;

export default function SupabaseSQLPage() {
  const [isCopied, setIsCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCHEMA);
      setIsCopied(true);
      toast({
        title: "SQL copied to clipboard",
        description: "Paste this into your Supabase SQL editor",
      });
      
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please select and copy the SQL manually",
        variant: "destructive"
      });
    }
  };

  const handleMarkAsApplied = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setErrorMessage('');

    try {
      // Simple connectivity and RLS test
      const { count, error } = await (supabase as any)
        .from('userai_profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      setVerificationResult('success');
      toast({
        title: "Schema verification successful",
        description: `Connected to userai_profiles table. Found ${count || 0} profile(s).`,
      });
    } catch (error) {
      console.error('Schema verification failed:', error);
      setVerificationResult('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      
      toast({
        title: "Schema verification failed",
        description: "Please ensure the SQL has been applied in Supabase",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supabase SQL Schema</h1>
        <p className="text-muted-foreground">
          Apply this SQL schema to your Supabase project to enable profile syncing
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Instructions:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Copy the SQL schema below</li>
            <li>Open your Supabase dashboard SQL Editor</li>
            <li>Paste and run the SQL schema</li>
            <li>Click "Mark as Applied" to verify the setup</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="flex gap-4">
        <Button
          onClick={handleCopy}
          variant="default"
          className="flex items-center gap-2"
        >
          {isCopied ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {isCopied ? 'Copied!' : 'Copy SQL Schema'}
        </Button>

        <Button
          onClick={handleMarkAsApplied}
          variant="outline"
          disabled={isVerifying}
          className="flex items-center gap-2"
        >
          {isVerifying ? (
            <Database className="w-4 h-4 animate-pulse" />
          ) : verificationResult === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : verificationResult === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          {isVerifying ? 'Verifying...' : 'Mark as Applied'}
        </Button>

        {verificationResult && (
          <Badge variant={verificationResult === 'success' ? 'default' : 'destructive'}>
            {verificationResult === 'success' ? 'Schema OK' : 'Schema Error'}
          </Badge>
        )}
      </div>

      {verificationResult === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Verification Error:</strong> {errorMessage}
            <br />
            <span className="text-sm">
              Make sure you've applied the SQL schema and have the correct RLS policies.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            SQL Schema for userai_profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto border">
            {SQL_SCHEMA}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this schema does</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-2">
            <p>• <strong>Creates the userai_profiles table</strong> with all necessary columns for storing profile data</p>
            <p>• <strong>Enables Row Level Security (RLS)</strong> to ensure users can only access their own profiles</p>
            <p>• <strong>Sets up ownership-based access policy</strong> using auth.uid() to match the owner column</p>
            <p>• <strong>Creates performance index</strong> on owner and updated_at for fast queries</p>
            <p>• <strong>Handles JSON fields</strong> for complex data like verbosity, question_rate, and safety settings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}