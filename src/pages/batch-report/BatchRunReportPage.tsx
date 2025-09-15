import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Download, 
  RefreshCw, 
  Filter, 
  BarChart3, 
  Users, 
  MessageSquare,
  Shield,
  AlertTriangle,
  ExternalLink,
  FileText,
  Play
} from 'lucide-react';
import { useRunsStore } from '@/store/runs';
import { useProfilesRepo } from '@/hooks/useProfilesRepo';
import { useScenariosStore } from '@/store/scenarios';
import { useToast } from '@/hooks/use-toast';
import { 
  BatchReportFilters,
  ProfileAggregateData,
  filterRuns,
  aggregateByProfile,
  findIdenticalColumns,
  exportAsCSV,
  exportAsMarkdown,
  generateExportFilename,
  downloadFile
} from '@/utils/batchReportUtils';
import { Link } from 'react-router-dom';

export default function BatchRunReportPage() {
  const { runs } = useRunsStore();
  const { profiles } = useProfilesRepo();
  const { scenarios } = useScenariosStore();
  const { toast } = useToast();

  // Filters state
  const [filters, setFilters] = useState<BatchReportFilters>({
    scenarioIds: [],
    profileIds: [],
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    minTurns: 1
  });

  // View options
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [normalizeByTurns, setNormalizeByTurns] = useState(true);

  // Initialize filters with available data
  useEffect(() => {
    // Get all scenario IDs that have runs
    const availableScenarioIds = new Set<string>();
    const availableProfileIds = new Set<string>();

    runs.forEach(run => {
      run.resultsJson?.forEach((result: any) => {
        availableScenarioIds.add(result.scenarioId);
        result.conversations?.forEach((conv: any) => {
          if (conv.userAI?.profileId) {
            availableProfileIds.add(conv.userAI.profileId);
          }
        });
      });
    });

    setFilters(prev => ({
      ...prev,
      scenarioIds: Array.from(availableScenarioIds),
      profileIds: Array.from(availableProfileIds)
    }));
  }, [runs]);

  // Filter and aggregate data
  const reportData = useMemo(() => {
    const filteredRuns = filterRuns(runs, filters);
    const profileAggregates = aggregateByProfile(filteredRuns, normalizeByTurns);
    
    return {
      profiles: profileAggregates,
      totalRuns: filteredRuns.length,
      totalTurns: profileAggregates.reduce((sum, p) => sum + p.totalTurns, 0),
      appliedFilters: filters
    };
  }, [runs, filters, normalizeByTurns]);

  // Find identical columns for differences-only view
  const identicalColumns = useMemo(() => 
    findIdenticalColumns(reportData.profiles), 
    [reportData.profiles]
  );

  // Filter profiles for differences-only view
  const displayProfiles = useMemo(() => {
    if (!showDifferencesOnly || reportData.profiles.length <= 1) {
      return reportData.profiles;
    }
    // For now, show all profiles but hide identical columns in the table
    return reportData.profiles;
  }, [reportData.profiles, showDifferencesOnly]);

  const handleRefresh = () => {
    // Force re-computation by updating a timestamp or similar
    toast({
      title: "Report refreshed",
      description: "Data has been updated with latest runs"
    });
  };

  const handleExportCSV = () => {
    const csv = exportAsCSV(reportData);
    const filename = generateExportFilename('batch-report', 'csv');
    downloadFile(csv, filename, 'text/csv');
    
    toast({
      title: "CSV exported",
      description: `Report exported to ${filename}`
    });
  };

  const handleExportMarkdown = () => {
    const markdown = exportAsMarkdown(reportData);
    const filename = generateExportFilename('batch-report', 'md');
    downloadFile(markdown, filename, 'text/markdown');
    
    toast({
      title: "Markdown exported", 
      description: `Report exported to ${filename}`
    });
  };

  const updateFilters = (key: keyof BatchReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Get available options for filters
  const availableScenarios = scenarios.filter(s => 
    runs.some(run => 
      run.resultsJson?.some((result: any) => result.scenarioId === s.id)
    )
  );

  const availableProfiles = profiles.filter(p =>
    runs.some(run =>
      run.resultsJson?.some((result: any) =>
        result.conversations?.some((conv: any) => conv.userAI?.profileId === p.id)
      )
    )
  );

  if (runs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Run Report</h1>
          <p className="text-muted-foreground">
            Compare USERAI profile performance across multiple runs and scenarios
          </p>
        </div>

        <Card className="p-12 text-center">
          <CardContent>
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No run data available</p>
              <p className="text-sm mb-4">Execute some batch runs with USERAI profiles to see comparisons here</p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline">
                  <Link to="/run">
                    <Play className="w-4 h-4 mr-2" />
                    Run Tests
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/profiles">
                    <Users className="w-4 h-4 mr-2" />
                    USERAI Profiles
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batch Run Report</h1>
          <p className="text-muted-foreground">
            Compare USERAI profile performance across multiple runs and scenarios
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportMarkdown}>
            <FileText className="w-4 h-4 mr-2" />
            Export MD
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => updateFilters('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                />
                <Input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => updateFilters('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                />
              </div>
            </div>

            {/* Min Turns */}
            <div className="space-y-2">
              <Label>Min Turns</Label>
              <Input
                type="number"
                min={1}
                value={filters.minTurns}
                onChange={(e) => updateFilters('minTurns', parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Scenarios - Simplified for now */}
            <div className="space-y-2">
              <Label>Scenarios ({filters.scenarioIds.length} selected)</Label>
              <Button variant="outline" size="sm" className="w-full justify-start">
                {availableScenarios.length} available
              </Button>
            </div>

            {/* Profiles - Simplified for now */}
            <div className="space-y-2">
              <Label>Profiles ({filters.profileIds.length} selected)</Label>
              <Button variant="outline" size="sm" className="w-full justify-start">
                {availableProfiles.length} available
              </Button>
            </div>
          </div>

          <Separator />

          {/* View Options */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="differences-only"
                checked={showDifferencesOnly}
                onCheckedChange={setShowDifferencesOnly}
              />
              <Label htmlFor="differences-only">Show Differences Only</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="normalize-turns"
                checked={normalizeByTurns}
                onCheckedChange={setNormalizeByTurns}
              />
              <Label htmlFor="normalize-turns">Normalize by Turns</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {displayProfiles.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No data matches current filters</p>
              <p className="text-sm">Try adjusting your date range or filter criteria</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Profiles</span>
                </div>
                <p className="text-2xl font-bold">{displayProfiles.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Runs</span>
                </div>
                <p className="text-2xl font-bold">{reportData.totalRuns}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Turns</span>
                </div>
                <p className="text-2xl font-bold">{reportData.totalTurns}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Safety Events</span>
                </div>
                <p className="text-2xl font-bold">
                  {displayProfiles.reduce((sum, p) => sum + p.safetyEscalations, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Profile</th>
                      <th className="text-left p-3 font-medium">Scenarios</th>
                      <th className="text-left p-3 font-medium">Runs</th>
                      {!showDifferencesOnly || !identicalColumns.has('avgChars') ? (
                        <th className="text-left p-3 font-medium">Avg Chars</th>
                      ) : null}
                      {!showDifferencesOnly || !identicalColumns.has('avgQuestions') ? (
                        <th className="text-left p-3 font-medium">Avg Questions</th>
                      ) : null}
                      {!showDifferencesOnly || !identicalColumns.has('topEmotions') ? (
                        <th className="text-left p-3 font-medium">Top Emotions</th>
                      ) : null}
                      {!showDifferencesOnly || !identicalColumns.has('topNeeds') ? (
                        <th className="text-left p-3 font-medium">Top Needs</th>
                      ) : null}
                      {!showDifferencesOnly || !identicalColumns.has('topBoundaries') ? (
                        <th className="text-left p-3 font-medium">Top Boundaries</th>
                      ) : null}
                      {!showDifferencesOnly || !identicalColumns.has('safetyEscalations') ? (
                        <th className="text-left p-3 font-medium">Safety</th>
                      ) : null}
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProfiles.map(profile => (
                      <tr key={profile.profileId} className="border-b hover:bg-muted/25">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{profile.profileName}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              v{profile.profileVersion}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="max-w-48 truncate text-sm text-muted-foreground">
                            {profile.scenarioNames.join(', ')}
                          </div>
                        </td>
                        <td className="p-3 text-center">{profile.runCount}</td>
                        {!showDifferencesOnly || !identicalColumns.has('avgChars') ? (
                          <td className="p-3 text-center">{profile.avgChars}</td>
                        ) : null}
                        {!showDifferencesOnly || !identicalColumns.has('avgQuestions') ? (
                          <td className="p-3 text-center">{profile.avgQuestions}</td>
                        ) : null}
                        {!showDifferencesOnly || !identicalColumns.has('topEmotions') ? (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-32">
                              {profile.topEmotions.slice(0, 2).map(emotion => (
                                <Badge key={emotion.item} variant="secondary" className="text-xs">
                                  {emotion.item}
                                </Badge>
                              ))}
                              {profile.topEmotions.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{profile.topEmotions.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                        ) : null}
                        {!showDifferencesOnly || !identicalColumns.has('topNeeds') ? (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-32">
                              {profile.topNeeds.slice(0, 2).map(need => (
                                <Badge key={need.item} variant="outline" className="text-xs">
                                  {need.item}
                                </Badge>
                              ))}
                              {profile.topNeeds.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{profile.topNeeds.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                        ) : null}
                        {!showDifferencesOnly || !identicalColumns.has('topBoundaries') ? (
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-32">
                              {profile.topBoundaries.slice(0, 2).map(boundary => (
                                <Badge key={boundary.item} variant="destructive" className="text-xs">
                                  {boundary.item}
                                </Badge>
                              ))}
                              {profile.topBoundaries.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{profile.topBoundaries.length - 2}
                                </Badge>
                              )}
                            </div>
                          </td>
                        ) : null}
                        {!showDifferencesOnly || !identicalColumns.has('safetyEscalations') ? (
                          <td className="p-3">
                            <div className="text-center">
                              <div className="font-medium">{profile.safetyEscalations}</div>
                              <div className="text-xs text-muted-foreground">
                                {profile.safetyEscalationsPct}%
                              </div>
                            </div>
                          </td>
                        ) : null}
                        <td className="p-3">
                          <Button
                            variant="outline" 
                            size="sm"
                            asChild
                          >
                            <Link to={`/results?profile=${profile.profileId}`}>
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Runs
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}