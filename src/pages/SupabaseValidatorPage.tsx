import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Database, RefreshCw, User, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataSource } from '@/state/dataSource';
import { useToast } from "@/hooks/use-toast";
import { dbAgeGroupToUi, uiAgeGroupToDb, deriveAgeGroup } from '@/utils/age';

interface ValidationResult {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function SupabaseValidatorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [ageGroupIssues, setAgeGroupIssues] = useState<any[]>([]);
  const { state: dataSourceState, getRepoHealth } = useDataSource();
  const { toast } = useToast();

      // Check userai_profiles table specifically with v2.1 fields
  useEffect(() => {
    if (dataSourceState.source === 'supabase') {
      runValidation();
    }
  }, [dataSourceState.source]);

  const runValidation = async () => {
    setIsLoading(true);
    setValidationResults([]);

    try {
      // Check authentication
      const { data: authData, error: authError } = await supabase.auth.getUser();
      setValidationResults(prev => [...prev, {
        id: 'auth',
        name: 'Authentication',
        status: authError ? 'error' : 'success',
        message: authError ? authError.message : `Authenticated as ${authData.user?.email || 'user'}`
      }]);

      // Check userai_profiles table structure
      try {
        // Try direct query to check if table exists and has required columns
        const { data: directCheck, error: directError } = await (supabase as any)
          .from('userai_profiles')
          .select('age_years, age_group, personality_preset, strictness')
          .limit(1);

        if (directError) {
          const msg = directError.message || '';
          if (msg.includes('relation') || msg.includes('not found') || msg.includes('does not exist')) {
            setValidationResults(prev => [...prev, {
              id: 'userai_profiles',
              name: 'USERAI Profiles Table',
              status: 'error',
              message: 'Table not found - needs to be created'
            }]);
          } else if (msg.includes('column')) {
            setValidationResults(prev => [...prev, {
              id: 'userai_profiles',
              name: 'USERAI Profiles Table',
              status: 'error',
              message: 'Table exists but missing v2.1 columns (age_years, age_group, personality_preset, strictness)'
            }]);
          } else {
            setValidationResults(prev => [...prev, {
              id: 'userai_profiles',
              name: 'USERAI Profiles Table',
              status: 'error',
              message: msg
            }]);
          }
        } else {
          setValidationResults(prev => [...prev, {
            id: 'userai_profiles',
            name: 'USERAI Profiles Table',
            status: 'success',
            message: 'v2.1 schema detected with required columns'
          }]);

          // Check age_group values if we have data
          const { data: sampleData, error: sampleError } = await (supabase as any)
            .from('userai_profiles')
            .select('id, age_years, age_group')
            .limit(10);

          if (!sampleError && sampleData) {
            const issues = sampleData.filter((row: any) => {
              if (!row.age_group && !row.age_years) return false;
              const mappedGroup = dbAgeGroupToUi(row.age_group);
              return mappedGroup === null && row.age_years != null;
            });

            setAgeGroupIssues(issues);
            
            if (issues.length > 0) {
              setValidationResults(prev => [...prev, {
                id: 'age_group_values',
                name: 'Age Group Values',
                status: 'error',
                message: `${issues.length} profiles have unmappable age_group values`
              }]);
            } else {
              setValidationResults(prev => [...prev, {
                id: 'age_group_values',
                name: 'Age Group Values',
                status: 'success',
                message: 'All age_group values are valid'
              }]);
            }
          }
        }
      } catch (err) {
        setValidationResults(prev => [...prev, {
          id: 'userai_profiles',
          name: 'USERAI Profiles Table',
          status: 'error',  
          message: `Failed to check table: ${err}`
        }]);
      }

      // Check other tables
      const otherTables = ['runs', 'turns', 'events'];
      for (const table of otherTables) {
        try {
          const { error } = await (supabase as any).from(table).select('*').limit(1);
          setValidationResults(prev => [...prev, {
            id: table,
            name: `Table: ${table}`,
            status: error ? 'error' : 'success',
            message: error ? error.message : 'Table accessible'
          }]);
        } catch (err) {
          setValidationResults(prev => [...prev, {
            id: table,
            name: `Table: ${table}`,
            status: 'error',  
            message: `Failed to check table: ${err}`
          }]);
        }
      }

      // Get repository health
      if (dataSourceState.source === 'supabase') {
        const health = await getRepoHealth();
        setValidationResults(prev => [...prev, {
          id: 'repo-health',
          name: 'Repository Health',
          status: health.ok ? 'success' : 'error',
          message: health.ok ? 'All repositories healthy' : health.errors.join(', ')
        }]);
      }

      toast({
        title: "Validation Complete",
        description: "Supabase validation finished"
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofix = async () => {
    if (ageGroupIssues.length === 0) return;
    
    setIsFixing(true);
    try {
      let fixed = 0;
      let failed = 0;

      for (const issue of ageGroupIssues) {
        try {
          const newAgeGroup = issue.age_years ? 
            uiAgeGroupToDb(deriveAgeGroup(issue.age_years)) : 
            null;

          if (newAgeGroup) {
            const { error } = await (supabase as any)
              .from('userai_profiles')
              .update({ age_group: newAgeGroup })
              .eq('id', issue.id);

            if (error) {
              failed++;
            } else {
              fixed++;
            }
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
        }
      }

      toast({
        title: "Autofix Complete",
        description: `Fixed: ${fixed}, Failed: ${failed}`,
        variant: fixed > 0 ? "default" : "destructive"
      });

      // Re-run validation
      runValidation();
    } catch (error) {
      toast({
        title: "Autofix Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Supabase Validator</h1>
        <p className="text-muted-foreground">
          Validate your Supabase configuration and database setup
        </p>
      </div>

      {/* Data Source Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {dataSourceState.source === 'supabase' ? (
              <Database className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            Data Source Status
          </CardTitle>
          <CardDescription>
            Current data source configuration and health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Active Source:</span>
              <Badge variant={dataSourceState.source === 'supabase' ? 'default' : 'secondary'}>
                {dataSourceState.source.charAt(0).toUpperCase() + dataSourceState.source.slice(1)}
              </Badge>
            </div>
            {dataSourceState.reason && (
              <div className="flex items-center justify-between">
                <span>Reason:</span>
                <span className="text-sm text-muted-foreground">{dataSourceState.reason}</span>
              </div>
            )}
            <Button
              onClick={runValidation}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Health Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Validation Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationResults.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground py-8">
              Click "Refresh Health Check" to run validation
            </div>
          )}
          
          {validationResults.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {result.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : result.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                )}
                <div>
                  <div className="font-medium">{result.name}</div>
                  {result.message && (
                    <div className="text-sm text-muted-foreground">{result.message}</div>
                  )}
                </div>
              </div>
              
              <Badge 
                variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}
              >
                {result.status === 'success' ? '✅ Pass' : result.status === 'error' ? '❌ Fail' : 'Pending'}
              </Badge>
            </div>
          ))}

          {/* userai_profiles specific fix button */}
          {validationResults.find(r => r.id === 'userai_profiles' && r.status === 'error') && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Create USERAI Profiles Table</h4>
              <p className="text-sm text-muted-foreground mb-3">
                The userai_profiles table is missing. Click below to open the SQL editor with the v2.1 schema:
              </p>
              <Button
                onClick={() => {
                  window.open('/supabase-sql', '_blank');
                  // Auto-scroll to profiles section after a short delay
                  setTimeout(() => {
                    const profilesSection = document.querySelector('[data-section="profiles-schema"]');
                    profilesSection?.scrollIntoView({ behavior: 'smooth' });
                  }, 500);
                }}
                size="sm"
              >
                <Database className="h-4 w-4 mr-2" />
                Open Supabase SQL (Profiles)
              </Button>
            </div>
          )}

          {/* age_group autofix button */}
          {ageGroupIssues.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Fix Age Group Values</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {ageGroupIssues.length} profiles have unmappable age_group values. This will update them based on age_years.
              </p>
              <Button
                onClick={handleAutofix}
                disabled={isFixing}
                size="sm"
                variant="secondary"
              >
                {isFixing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4 mr-2" />
                )}
                {isFixing ? 'Fixing...' : 'Migrate Age Groups to v2.1'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}