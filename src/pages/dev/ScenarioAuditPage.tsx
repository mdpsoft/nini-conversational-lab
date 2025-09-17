import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { scanRepoFor, categorizeMatch, assessRisk, generateSuggestedAction } from '@/utils/repoScanner';
import { AuditMatch, AuditSummary, RelationshipType } from '@/types/scenario-audit';
import { Scenario } from '@/types/scenario';
import { useScenariosStore } from '@/store/scenarios';
import { getRelationshipTypeLabel } from '@/types/scenario';
import { supabase } from '@/integrations/supabase/client';

export default function ScenarioAuditPage() {
  const [auditResults, setAuditResults] = useState<AuditMatch[]>([]);
  const [summary, setSummary] = useState<AuditSummary>({
    attachmentStyleRefs: 0,
    topicRefs: 0,
    relationshipTypeRefs: 0,
    breakpoints: 0,
    storedScenarios: {
      local: 0,
      supabase: 0,
      withAttachmentStyle: 0,
      withTopic: 0,
      withRelationshipType: 0,
      withCrisisSignals: 0,
    }
  });
  const [scenarioMigrationPreview, setScenarioMigrationPreview] = useState<{
    scenarios: Scenario[];
    mappingPreview: Array<{
      id: string;
      name: string;
      currentTopic: string;
      suggestedRelationshipType: RelationshipType | null;
      currentAttachmentStyle: string;
    }>;
  }>({ scenarios: [], mappingPreview: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  const { scenarios: localScenarios } = useScenariosStore();

  const runAudit = async () => {
    setIsLoading(true);
    
    try {
      // Scan for patterns
      const scanResults = await scanRepoFor([
        'attachmentStyle', 'attachment_style', 'Attachment Style',
        'topic', 'relationshipType', 'relationship_type'
      ]);
      
      // Convert scan results to audit matches
      const matches: AuditMatch[] = scanResults.map(result => {
        const category = categorizeMatch(result.path, result.content);
        const risk = assessRisk(result.path, result.content, result.context);
        const suggestedAction = generateSuggestedAction(result.path, result.content, risk);
        
        return {
          path: result.path,
          line: result.line,
          snippet: result.content,
          category,
          risk,
          suggestedAction
        };
      });
      
      setAuditResults(matches);
      
      // Calculate summary
      const attachmentStyleRefs = matches.filter(m => 
        m.snippet.includes('attachment') || m.snippet.includes('Attachment')
      ).length;
      
      const topicRefs = matches.filter(m => 
        m.snippet.includes('topic') && !m.snippet.includes('attachment')
      ).length;
      
      const breakpoints = matches.filter(m => m.risk === 'High').length;
      
      // Analyze stored scenarios
      let supabaseScenarios: Scenario[] = [];
      let supabaseCount = 0;
      
      try {
        // Use supabase client instead of direct fetch with hardcoded keys
        const { data: scenariosData, error } = await supabase
          .from('scenarios')
          .select('*')
          .limit(50);
        
        if (error) {
          console.warn('Failed to fetch Supabase scenarios:', error);
          supabaseScenarios = [];
          supabaseCount = 0;
        } else {
          // Convert Supabase data to local Scenario format
          supabaseScenarios = (scenariosData || []).map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || '',
            relationshipType: 'just_friend' as const, // Default value for missing fields
            language: 'en' // Default value for missing fields
          }));
          supabaseCount = (scenariosData || []).length;
        }
      } catch (error) {
        // Supabase scenarios table doesn't exist or not accessible
        console.log('Supabase scenarios not available:', error);
      }
      
      const allScenarios = [...localScenarios, ...supabaseScenarios];
      
      const mappingPreview = allScenarios.slice(0, 20).map(scenario => ({
        id: scenario.id,
        name: scenario.name,
        currentTopic: (scenario as any).topic || 'N/A', // Legacy field
        suggestedRelationshipType: scenario.relationshipType || mapTopicToRelationshipType((scenario as any).topic),
        currentAttachmentStyle: (scenario as any).attachment_style || 'N/A' // Legacy field
      }));
      
      setScenarioMigrationPreview({
        scenarios: allScenarios as any,
        mappingPreview
      });
      
      setSummary({
        attachmentStyleRefs,
        topicRefs,
        relationshipTypeRefs: 0, // Currently none exist
        breakpoints,
        storedScenarios: {
          local: localScenarios.length,
          supabase: supabaseCount,
          withAttachmentStyle: allScenarios.filter(s => (s as any).attachment_style).length,
          withTopic: allScenarios.filter(s => (s as any).topic).length,
          withRelationshipType: allScenarios.filter(s => s.relationshipType).length,
          withCrisisSignals: allScenarios.filter(s => s.crisisSignals && s.crisisSignals !== 'none').length,
        }
      });
      
      toast.success(`Audit completed: ${matches.length} references found`);
      
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Audit failed: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const mapTopicToRelationshipType = (topic: string): RelationshipType | null => {
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('relationship') || topicLower.includes('couple')) {
      return 'in_relationship';
    }
    if (topicLower.includes('dating')) {
      return 'dating_undefined';
    }
    if (topicLower.includes('ex') || topicLower.includes('breakup')) {
      return 'ex';
    }
    if (topicLower.includes('friend')) {
      return 'just_friend';
    }
    if (topicLower.includes('work') || topicLower.includes('coworker')) {
      return 'coworker';
    }
    if (topicLower.includes('family')) {
      return 'family_member';
    }
    
    // Default fallback for unclear topics
    return 'situationship';
  };

  const exportResults = (format: 'csv' | 'json' | 'md') => {
    let content = '';
    let filename = '';
    let mimeType = '';
    
    if (format === 'csv') {
      content = [
        'Path,Line,Category,Risk,Snippet,Suggested Action',
        ...auditResults.map(match => 
          `"${match.path}",${match.line},"${match.category}","${match.risk}","${match.snippet.replace(/"/g, '""')}","${match.suggestedAction.replace(/"/g, '""')}"`
        )
      ].join('\n');
      filename = 'scenario-audit-results.csv';
      mimeType = 'text/csv';
    } else if (format === 'json') {
      content = JSON.stringify({
        summary,
        results: auditResults,
        migrationPreview: scenarioMigrationPreview.mappingPreview
      }, null, 2);
      filename = 'scenario-audit-results.json';
      mimeType = 'application/json';
    } else if (format === 'md') {
      content = [
        '# Scenario Field Change Impact Audit',
        '',
        '## Summary',
        `- Attachment Style References: ${summary.attachmentStyleRefs}`,
        `- Topic References: ${summary.topicRefs}`,
        `- High Risk Breakpoints: ${summary.breakpoints}`,
        `- Local Scenarios: ${summary.storedScenarios.local}`,
        `- Supabase Scenarios: ${summary.storedScenarios.supabase}`,
        '',
        '## Impact Analysis',
        '',
        '| Path | Line | Category | Risk | Suggested Action |',
        '|------|------|----------|------|------------------|',
        ...auditResults.map(match => 
          `| ${match.path} | ${match.line} | ${match.category} | ${match.risk} | ${match.suggestedAction} |`
        )
      ].join('\n');
      filename = 'scenario-audit-results.md';
      mimeType = 'text/markdown';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  useEffect(() => {
    runAudit();
  }, []);

  const getRiskIcon = (risk: AuditMatch['risk']) => {
    switch (risk) {
      case 'High': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'Medium': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'Low': return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const getRiskBadgeVariant = (risk: AuditMatch['risk']) => {
    switch (risk) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Low': return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Scenario Field Change Impact Audit</h1>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Re-run Audit
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This is a <strong>dry-run audit</strong> for removing <code>attachmentStyle</code> and replacing <code>topic</code> with <code>relationshipType</code>. 
          No data will be modified. Review the impact report before proceeding with actual refactoring.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attachment Style Refs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.attachmentStyleRefs}</div>
            <p className="text-xs text-muted-foreground">Code references to remove</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Topic Refs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.topicRefs}</div>
            <p className="text-xs text-muted-foreground">To migrate to relationshipType</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Risk Breakpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.breakpoints}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stored Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.storedScenarios.local + summary.storedScenarios.supabase}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.storedScenarios.local} local, {summary.storedScenarios.supabase} Supabase
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="impact" className="space-y-4">
        <TabsList>
          <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          <TabsTrigger value="migration">Data Migration Preview</TabsTrigger>
          <TabsTrigger value="export">Export Results</TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Impact Table</CardTitle>
              <CardDescription>
                All references that will be affected by the field changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Line</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Snippet</TableHead>
                      <TableHead>Suggested Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditResults.map((match, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{match.path}</TableCell>
                        <TableCell>{match.line}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{match.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRiskIcon(match.risk)}
                            <Badge variant={getRiskBadgeVariant(match.risk)}>{match.risk}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-md truncate">
                          {match.snippet}
                        </TableCell>
                        <TableCell className="text-sm">{match.suggestedAction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Data Summary</CardTitle>
                <CardDescription>Current state of stored scenarios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Total scenarios:</span>
                  <span className="font-mono">{scenarioMigrationPreview.scenarios.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>With attachment_style:</span>
                  <span className="font-mono">{summary.storedScenarios.withAttachmentStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span>With topic:</span>
                  <span className="font-mono">{summary.storedScenarios.withTopic}</span>
                </div>
                <div className="flex justify-between">
                  <span>With crisis_signals:</span>
                  <span className="font-mono">{summary.storedScenarios.withCrisisSignals}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Migration Preview</CardTitle>
                <CardDescription>First 20 scenarios - topic → relationshipType mapping</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scenarioMigrationPreview.mappingPreview.map((preview) => (
                    <div key={preview.id} className="border rounded p-3 space-y-2">
                      <div className="font-medium truncate">{preview.name}</div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current topic:</span>
                          <Badge variant="outline">{preview.currentTopic}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">→ relationshipType:</span>
                          <Badge variant="secondary">
                            {preview.suggestedRelationshipType || 'null'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Remove attachment:</span>
                          <Badge variant="destructive">{preview.currentAttachmentStyle}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Audit Results</CardTitle>
              <CardDescription>Download the complete audit report in various formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={() => exportResults('csv')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={() => exportResults('json')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button onClick={() => exportResults('md')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Markdown
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Ready to apply the refactor? (Coming in next prompt)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Apply Refactor (Safe) - Coming Soon
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This will be enabled in the next prompt to safely apply all the changes identified in this audit.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}