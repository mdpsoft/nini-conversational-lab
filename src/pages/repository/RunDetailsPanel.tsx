import { useRunsStore } from "@/store/runs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { 
  ExternalLink, 
  Download, 
  Play, 
  Trash2, 
  Pin, 
  Archive, 
  X,
  Plus,
  Hash,
  Calendar,
  Settings,
  BarChart3,
  AlertCircle
} from "lucide-react";

interface RunDetailsPanelProps {
  runId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RunDetailsPanel({ runId, open, onClose }: RunDetailsPanelProps) {
  const { runs, addTag, removeTag, setNotes, togglePinned, setArchived, bulkDelete } = useRunsStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  
  const run = runs.find(r => r.runId === runId);

  if (!run) return null;

  const handleAddTag = () => {
    if (newTag.trim() && !run.repo.tags.includes(newTag.trim())) {
      addTag(run.runId, newTag.trim());
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    removeTag(run.runId, tag);
  };

  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `run-${run.runId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: "Run data downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export run data",
        variant: "destructive",
      });
    }
  };

  const handleOpenResults = () => {
    navigate(`/results?run=${run.runId}`);
    onClose();
  };

  const handleRerun = () => {
    toast({
      title: "Rerun not yet implemented",
      description: "This feature will be available soon",
    });
  };

  const handleDelete = () => {
    bulkDelete([run.runId]);
    toast({
      title: "Run deleted",
      description: "The run has been removed from the repository",
    });
    onClose();
  };

  const getMetricColor = (value: number, benchmark: number) => {
    if (value >= benchmark) return "bg-green-500";
    if (value >= benchmark * 0.8) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] p-0 overflow-y-auto">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <SheetTitle className="font-mono text-sm">
                {run.runId.slice(0, 12)}...
              </SheetTitle>
            </div>
            <Badge variant={run.status === 'completed' ? 'default' : 'destructive'}>
              {run.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {new Date(run.createdAt).toLocaleString()}
          </div>
        </SheetHeader>

        <div className="p-6 space-y-6">
          {/* Meta Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4" />
              <h3 className="font-medium">Configuration</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span>{run.model || 'Default'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <Badge variant={run.simulationMode ? "secondary" : "default"}>
                  {run.simulationMode ? "Simulation" : "API"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scenarios:</span>
                <span>{run.scenarioCount || run.scenarioIds?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conversations:</span>
                <span>{run.conversationsPerScenario || 0} per scenario</span>
              </div>
              {run.promptHash && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prompt hash:</span>
                  <span className="font-mono text-xs">{run.promptHash.slice(0, 8)}...</span>
                </div>
              )}
              {run.xmlVersion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">XML version:</span>
                  <span className="font-mono text-xs">{run.xmlVersion}</span>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Metrics Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" />
              <h3 className="font-medium">Performance Metrics</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Total Score</span>
                  <span>{Math.round(run.metrics?.avgTotal || 0)}/100</span>
                </div>
                <Progress 
                  value={run.metrics?.avgTotal || 0} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Safety Score</span>
                  <span>{Math.round(run.metrics?.avgSafety || 0)}/100</span>
                </div>
                <Progress 
                  value={run.metrics?.avgSafety || 0} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Structural Score</span>
                  <span>{Math.round(run.metrics?.avgStructural || 0)}/100</span>
                </div>
                <Progress 
                  value={run.metrics?.avgStructural || 0} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Qualitative Score</span>
                  <span>{Math.round(run.metrics?.avgQualitative || 0)}/100</span>
                </div>
                <Progress 
                  value={run.metrics?.avgQualitative || 0} 
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {Math.round((run.metrics?.approvalRate || 0) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Approval Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-500">
                    {run.metrics?.criticalIssues || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical Issues</div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Repository Meta Section */}
          <section>
            <h3 className="font-medium mb-3">Repository Meta</h3>
            
            <div className="space-y-4">
              {/* Tags */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {run.repo.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea 
                  placeholder="Add notes about this run..."
                  value={run.repo.notes || ""} 
                  onChange={e => setNotes(run.runId, e.target.value)}
                  rows={3}
                />
              </div>

              {/* Status toggles */}
              <div className="flex gap-2">
                <Button 
                  variant={run.repo.pinned ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePinned(run.runId)}
                >
                  <Pin className="w-4 h-4 mr-2" />
                  {run.repo.pinned ? "Pinned as baseline" : "Pin as baseline"}
                </Button>
                <Button 
                  variant={run.repo.archived ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setArchived(run.runId, !run.repo.archived)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {run.repo.archived ? "Archived" : "Archive"}
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          {/* Actions Section */}
          <section>
            <h3 className="font-medium mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleOpenResults}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Results
              </Button>
              <Button variant="outline" onClick={handleExportJSON}>
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" onClick={handleRerun}>
                <Play className="w-4 h-4 mr-2" />
                Rerun
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}