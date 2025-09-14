import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { useRunsStore } from "../../store/runs";
import { MetricsCard } from "../../components/MetricsCard";
import { ChatViewer } from "../../components/ChatViewer";
import { LintBadge } from "../../components/LintBadge";
import { exportRun } from "../../utils/export";
import { isConversationApproved, calculateScenarioApproval } from "../../core/scoring/score";
import { useToast } from "@/hooks/use-toast";

export default function ResultsPage() {
  const { runs, exportRun: exportRunFromStore } = useRunsStore();
  const { toast } = useToast();

  const [selectedRun, setSelectedRun] = useState<string | null>(
    runs.length > 0 ? runs[0].runId : null
  );
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false);

  const currentRun = runs.find(run => run.runId === selectedRun);

  const calculateRunMetrics = (run: any) => {
    if (!run?.results) return null;

    let totalConversations = 0;
    let approvedConversations = 0;
    let totalStructural = 0;
    let totalSafety = 0;
    let totalQualitative = 0;
    let totalScore = 0;
    let criticalCount = 0;

    run.results.forEach((result: any) => {
      result.conversations.forEach((conv: any) => {
        totalConversations++;
        
        if (conv.scores) {
          totalStructural += conv.scores.structural;
          totalSafety += conv.scores.safety;
          totalQualitative += conv.scores.qualitative;
          totalScore += conv.scores.total;

          if (isConversationApproved(conv.scores)) {
            approvedConversations++;
          }
        }

        // Check for critical issues
        conv.lints?.forEach((lintResult: any) => {
          lintResult.findings.forEach((finding: any) => {
            if (!finding.pass && finding.code === 'CRISIS_MISSED') {
              criticalCount++;
            }
          });
        });
      });
    });

    const averageStructural = totalConversations > 0 ? totalStructural / totalConversations : 0;
    const averageSafety = totalConversations > 0 ? totalSafety / totalConversations : 0;
    const averageQualitative = totalConversations > 0 ? totalQualitative / totalConversations : 0;
    const averageTotal = totalConversations > 0 ? totalScore / totalConversations : 0;
    const approvalRate = totalConversations > 0 ? approvedConversations / totalConversations : 0;

    return {
      totalConversations,
      approvedConversations,
      averageStructural,
      averageSafety,
      averageQualitative,
      averageTotal,
      approvalRate,
      criticalCount,
    };
  };

  const handleExportRun = () => {
    if (!currentRun) return;

    exportRun(currentRun);
    toast({
      title: "Export completed",
      description: "Run data has been downloaded",
    });
  };

  const handleViewConversation = (conversation: any) => {
    setSelectedConversation(conversation);
    setConversationDialogOpen(true);
  };

  const getScenarioMetrics = (scenarioResult: any) => {
    const conversations = scenarioResult.conversations || [];
    const approvedCount = conversations.filter((conv: any) => 
      conv.scores && isConversationApproved(conv.scores)
    ).length;
    
    const avgSafety = conversations.length > 0 
      ? conversations.reduce((sum: number, conv: any) => sum + (conv.scores?.safety || 0), 0) / conversations.length
      : 0;
      
    const avgTotal = conversations.length > 0
      ? conversations.reduce((sum: number, conv: any) => sum + (conv.scores?.total || 0), 0) / conversations.length
      : 0;

    return {
      total: conversations.length,
      approved: approvedCount,
      approvalRate: conversations.length > 0 ? approvedCount / conversations.length : 0,
      avgSafety,
      avgTotal,
    };
  };

  if (runs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-4">No Results</h1>
          <p className="text-muted-foreground mb-6">
            Run some test scenarios first to see results here.
          </p>
          <Button variant="outline">
            Go to Run Tests
          </Button>
        </div>
      </div>
    );
  }

  const metrics = currentRun ? calculateRunMetrics(currentRun) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Results</h1>
          <p className="text-muted-foreground">Analyze conversation outcomes and performance metrics</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedRun || ""} onValueChange={setSelectedRun}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a run" />
            </SelectTrigger>
            <SelectContent>
              {runs.map((run) => (
                <SelectItem key={run.runId} value={run.runId}>
                  {run.runId} ({new Date(run.createdAt).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={handleExportRun} disabled={!currentRun}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Total Score"
              value={metrics.averageTotal}
              format="score"
              status={metrics.averageTotal >= 90 ? 'good' : metrics.averageTotal >= 70 ? 'warning' : 'critical'}
            />
            
            <MetricsCard
              title="Safety Score"
              value={metrics.averageSafety}
              format="score"
              status={metrics.averageSafety >= 95 ? 'good' : metrics.averageSafety >= 85 ? 'warning' : 'critical'}
            />
            
            <MetricsCard
              title="Approval Rate"
              value={metrics.approvalRate}
              format="percentage"
              status={metrics.approvalRate >= 0.85 ? 'good' : metrics.approvalRate >= 0.7 ? 'warning' : 'critical'}
            />
            
            <MetricsCard
              title="Critical Issues"
              value={metrics.criticalCount}
              status={metrics.criticalCount === 0 ? 'good' : 'critical'}
              subtitle={`${metrics.totalConversations} total conversations`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricsCard
              title="Structural Score"
              value={metrics.averageStructural}
              format="score"
              status={metrics.averageStructural >= 90 ? 'good' : metrics.averageStructural >= 75 ? 'warning' : 'critical'}
            />
            
            <MetricsCard
              title="Qualitative Score"
              value={metrics.averageQualitative}
              format="score"
              status={metrics.averageQualitative >= 80 ? 'good' : 'warning'}
            />
            
            <MetricsCard
              title="Approved Conversations"
              value={metrics.approvedConversations}
              subtitle={`of ${metrics.totalConversations} total`}
            />
          </div>

          <Separator />

          {/* Scenarios Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Scenarios Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario ID</TableHead>
                    <TableHead>Conversations</TableHead>
                    <TableHead>Approval Rate</TableHead>
                    <TableHead>Avg Safety</TableHead>
                    <TableHead>Avg Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRun.results.map((result: any) => {
                    const scenarioMetrics = getScenarioMetrics(result);
                    
                    return (
                      <TableRow key={result.scenarioId}>
                        <TableCell className="font-medium">
                          {result.scenarioId.slice(-8)}
                        </TableCell>
                        <TableCell>{scenarioMetrics.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{Math.round(scenarioMetrics.approvalRate * 100)}%</span>
                            <Badge variant="outline" className="text-xs">
                              {scenarioMetrics.approved}/{scenarioMetrics.total}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={scenarioMetrics.avgSafety >= 95 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {Math.round(scenarioMetrics.avgSafety)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={scenarioMetrics.avgTotal >= 90 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {Math.round(scenarioMetrics.avgTotal)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {scenarioMetrics.approvalRate >= 0.8 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : scenarioMetrics.approvalRate >= 0.6 ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Individual Conversations */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentRun.results.map((result: any) =>
                  result.conversations.map((conversation: any, index: number) => (
                    <div
                      key={`${result.scenarioId}-${index}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewConversation(conversation)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Conversation {index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {result.scenarioId.slice(-8)}
                          </Badge>
                          {conversation.scores && (
                            <Badge 
                              variant={isConversationApproved(conversation.scores) ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {isConversationApproved(conversation.scores) ? 'APPROVED' : 'REJECTED'}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {conversation.lints?.slice(0, 3).map((lintResult: any, lintIndex: number) =>
                            lintResult.findings.slice(0, 2).map((finding: any, findingIndex: number) => (
                              <LintBadge 
                                key={`${lintIndex}-${findingIndex}`} 
                                finding={finding} 
                              />
                            ))
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {conversation.scores && (
                          <div className="text-sm font-medium">
                            {conversation.scores.total}/100
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {conversation.turns.length} turns
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Conversation Detail Dialog */}
      <Dialog open={conversationDialogOpen} onOpenChange={setConversationDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 sm:rounded-lg max-h-[90dvh] overflow-y-auto">
          {/* Header sticky */}
          <DialogHeader className="sticky top-0 bg-background z-10 border-b">
            <div className="flex items-center justify-between gap-3 p-4">
              <DialogTitle>
                Conversation Details
                {selectedConversation?.scores && (
                  <span className="ml-2 text-xs font-medium rounded-full bg-muted px-2 py-1">
                    Score: {Math.round(selectedConversation.scores.total)}/100
                  </span>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Contenido scrollable */}
          <div className="p-4 space-y-6">
            {selectedConversation && (
              <>
                {/* Score Breakdown */}
                {selectedConversation.scores && (
                  <section className="rounded-lg border bg-card p-4">
                    <h3 className="font-medium mb-4">Score Breakdown</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {selectedConversation.scores.total}
                        </div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {selectedConversation.scores.structural}
                        </div>
                        <div className="text-xs text-muted-foreground">Structural</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {selectedConversation.scores.safety}
                        </div>
                        <div className="text-xs text-muted-foreground">Safety</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {selectedConversation.scores.qualitative}
                        </div>
                        <div className="text-xs text-muted-foreground">Qualitative</div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Lint Results */}
                <section className="rounded-lg border bg-card p-4">
                  <h3 className="font-medium mb-4">Lint Results</h3>
                  <div className="space-y-2">
                    {selectedConversation.lints?.map((lintResult: any, index: number) => (
                      <div key={index} className="border-l-2 border-muted pl-4">
                        <div className="font-medium text-sm mb-1">
                          Turn {lintResult.turnIndex + 1}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {lintResult.findings.map((finding: any, findingIndex: number) => (
                            <LintBadge key={findingIndex} finding={finding} />
                          ))}
                        </div>
                      </div>
                    )) || (
                      <p className="text-muted-foreground text-sm">No lint issues found</p>
                    )}
                  </div>
                </section>

                {/* Full Conversation */}
                <section className="rounded-lg border bg-card p-0">
                  <div className="border-b px-4 py-3 font-medium">Full Conversation</div>
                  <div className="p-4">
                    <ChatViewer turns={selectedConversation.turns} />
                  </div>
                </section>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}