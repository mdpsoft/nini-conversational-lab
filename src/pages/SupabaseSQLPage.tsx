import { useState } from 'react';
import { Copy, CheckCircle, AlertCircle, Database, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PROFILES_SCHEMA_V21 = `create extension if not exists pgcrypto;

create table if not exists public.userai_profiles (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  lang text default 'es',
  age_years int check (age_years >= 0),
  age_group text check (age_group in ('teen','young_adult','adult','middle_aged','senior')),
  personality_preset text,
  preset_source text check (preset_source in ('preset','custom')),
  strictness text default 'balanced',
  tone text,
  traits jsonb default '[]'::jsonb,
  emotions_focus jsonb default '[]'::jsonb,
  needs_focus jsonb default '[]'::jsonb,
  boundaries_focus jsonb default '[]'::jsonb,
  verbosity jsonb default '{"paragraphs":"unlimited","soft_char_limit":1000,"hard_char_limit":null}'::jsonb,
  question_rate jsonb default '{"min":0,"max":2}'::jsonb,
  safety jsonb default '{"ban_phrases":[],"escalation":"remind_safety_protocol"}'::jsonb,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_userai_profiles_owner on public.userai_profiles(owner);

create or replace function update_userai_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_userai_profiles_updated_at on public.userai_profiles;
create trigger trg_userai_profiles_updated_at
before update on public.userai_profiles
for each row
execute function update_userai_profiles_updated_at();

alter table public.userai_profiles enable row level security;

drop policy if exists "select_own" on public.userai_profiles;
create policy "select_own" on public.userai_profiles
  for select using (auth.uid() = owner);

drop policy if exists "insert_own" on public.userai_profiles;
create policy "insert_own" on public.userai_profiles
  for insert with check (auth.uid() = owner);

drop policy if exists "update_own" on public.userai_profiles;
create policy "update_own" on public.userai_profiles
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "delete_own" on public.userai_profiles;
create policy "delete_own" on public.userai_profiles
  for delete using (auth.uid() = owner);`;

// Legacy SQL for backward compatibility
const LEGACY_SQL_SCHEMA = `create extension if not exists pgcrypto;

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
  const [isRunning, setIsRunning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'error' | null>(null);
  const [runResult, setRunResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [editableSQL, setEditableSQL] = useState(PROFILES_SCHEMA_V21);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableSQL);
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

  const handleRunNow = async () => {
    setIsRunning(true);
    setRunResult(null);
    setErrorMessage('');

    try {
      // For now, direct SQL execution is not possible from client
      // Guide users to use Copy SQL and run in Supabase dashboard
      throw new Error('Direct SQL execution requires Supabase SQL Editor. Please copy the SQL and run it in your Supabase dashboard.');

      setRunResult('error'); // Changed to error since we're not actually running
      toast({
        title: "Manual execution required",
        description: "Copy the SQL and run it in your Supabase dashboard, then click Verify Schema",
        variant: "default"
      });

      // Emit schema-changed event for validator refresh
      window.dispatchEvent(new CustomEvent('schema-changed'));
      
      // Don't auto-verify after manual instruction
      // setTimeout(() => handleMarkAsApplied(), 1000);
      
    } catch (error) {
      console.error('SQL execution failed:', error);
      setRunResult('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(message);
      
      toast({
        title: "Schema execution failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleMarkAsApplied = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setErrorMessage('');

    try {
      // Test table access and get column info
      const { data, error } = await (supabase as any)
        .from('userai_profiles')
        .select('id, name, age_years, age_group, personality_preset')
        .limit(1);

      if (error) {
        throw error;
      }

      setVerificationResult('success');
      toast({
        title: "Schema verification successful",
        description: "userai_profiles table is ready with v2.1 schema",
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
          Create and manage the USERAI Profiles schema in your Supabase project
        </p>
      </div>

      {/* Profiles Schema v2.1 Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-section="profiles-schema">
            <Database className="w-5 h-5" />
            Profiles Schema (v2.1)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>New v2.1 Features:</strong> Age tracking, personality presets, strictness levels, and improved RLS policies.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleRunNow}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Running...' : 'Run Now'}
            </Button>

            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isCopied ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {isCopied ? 'Copied!' : 'Copy SQL'}
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
              {isVerifying ? 'Verifying...' : 'Verify Schema'}
            </Button>

            {/* Status badges */}
            {runResult && (
              <Badge variant={runResult === 'success' ? 'default' : 'destructive'}>
                {runResult === 'success' ? 'Executed ✓' : 'Run Failed ✗'}
              </Badge>
            )}
            
            {verificationResult && (
              <Badge variant={verificationResult === 'success' ? 'default' : 'destructive'}>
                {verificationResult === 'success' ? 'Schema OK ✓' : 'Schema Error ✗'}
              </Badge>
            )}
          </div>

          {/* Error display */}
          {(verificationResult === 'error' || runResult === 'error') && errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Editable SQL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">SQL Schema (Editable):</label>
            <Textarea
              value={editableSQL}
              onChange={(e) => setEditableSQL(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="SQL schema for userai_profiles..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Legacy Schema Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 opacity-60" />
            Legacy Schema (v1.0)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is the legacy schema for backward compatibility. Use v2.1 above for new installations.
            </AlertDescription>
          </Alert>
          
          <pre className="bg-muted p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto border mt-4">
            {LEGACY_SQL_SCHEMA}
          </pre>
        </CardContent>
      </Card>

      {/* Schema Information */}
      <Card>
        <CardHeader>
          <CardTitle>What v2.1 Schema Provides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-2">
            <p>• <strong>Age Tracking:</strong> age_years (numeric) and age_group (categorical) fields</p>
            <p>• <strong>Personality Presets:</strong> personality_preset field for predefined personality types</p>
            <p>• <strong>Preset Source:</strong> preset_source to track if using preset or custom configuration</p>
            <p>• <strong>Strictness Levels:</strong> strictness field for behavioral control (lenient/balanced/firm)</p>
            <p>• <strong>UUID Primary Keys:</strong> Uses UUID instead of text for better performance</p>
            <p>• <strong>Improved RLS:</strong> Separate policies for each operation (select/insert/update/delete)</p>
            <p>• <strong>Auto-timestamps:</strong> Trigger-based updated_at timestamp maintenance</p>
            <p>• <strong>JSON Schema:</strong> Proper JSONB defaults for complex fields</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}