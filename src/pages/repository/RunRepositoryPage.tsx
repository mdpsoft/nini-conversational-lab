import { useRunsStore } from "@/store/runs";
import { useViewsStore, type RepositoryFilters } from "@/store/viewsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  FolderOpen, 
  Pin, 
  Archive, 
  Trash2, 
  Download, 
  Eye, 
  Calendar as CalendarIcon,
  Filter,
  Save,
  X,
  Plus,
  Settings,
  ChevronDown
} from "lucide-react";
import { RunDetailsPanel } from "./RunDetailsPanel";

export default function RunRepositoryPage() {
  const { runs, bulkDelete, setArchived, togglePinned } = useRunsStore();
  const { savedViews, currentView, addView, removeView, applyView, clearCurrentView } = useViewsStore();
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<RepositoryFilters>({
    query: "",
    status: "all",
    hideArchived: true,
  });
  
  // UI state
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  const nav = useNavigate();

  // Get unique tags from all runs for filter options
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    runs.forEach(run => {
      run.repo.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [runs]);

  // Filter and sort runs
  const filteredRuns = useMemo(() => {
    return runs
      .filter(r => {
        // Hide archived filter
        if (filters.hideArchived && r.repo?.archived) return false;
        
        // Status filter
        if (filters.status && filters.status !== "all" && r.status !== filters.status) return false;
        
        // Query filter
        if (filters.query) {
          const query = filters.query.toLowerCase();
          const searchableText = [
            r.runId,
            ...(r.repo?.tags ?? []),
            r.repo?.notes ?? "",
            r.model ?? "",
          ].join(" ").toLowerCase();
          if (!searchableText.includes(query)) return false;
        }
        
        // Date range filter
        if (filters.dateRange) {
          const runDate = new Date(r.createdAt);
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          if (runDate < start || runDate > end) return false;
        }
        
        // Approval rate filter
        if (filters.approvalRateMin !== undefined) {
          const approvalRate = (r.metrics?.approvalRate ?? 0) * 100;
          if (approvalRate < filters.approvalRateMin) return false;
        }
        
        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
          const runTags = r.repo?.tags ?? [];
          if (!filters.tags.some(tag => runTags.includes(tag))) return false;
        }
        
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [runs, filters]);

  const allChecked = selected.length > 0 && selected.length === filteredRuns.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(filteredRuns.map(r => r.runId));
    } else {
      setSelected([]);
    }
  };

  const handleSelectRow = (runId: string, checked: boolean) => {
    setSelected(prev => 
      checked 
        ? [...prev, runId] 
        : prev.filter(id => id !== runId)
    );
  };

  const handleOpenDetails = (runId: string) => {
    setSelectedRunId(runId);
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    setSelectedRunId(null);
  };

  const handleApplyView = (viewId: string) => {
    const view = applyView(viewId);
    if (view) {
      setFilters(view.filters);
      setSelected([]);
      
      // Update date pickers if date range exists
      if (view.filters.dateRange) {
        setDateFrom(new Date(view.filters.dateRange.start));
        setDateTo(new Date(view.filters.dateRange.end));
      } else {
        setDateFrom(undefined);
        setDateTo(undefined);
      }
      
      toast({
        title: "View applied",
        description: `Applied "${view.name}" view`,
      });
    }
  };

  const handleSaveView = () => {
    if (!saveViewName.trim()) return;
    
    // Include current date range in filters if set
    const filtersToSave = { ...filters };
    if (dateFrom && dateTo) {
      filtersToSave.dateRange = {
        start: dateFrom.toISOString(),
        end: dateTo.toISOString(),
      };
    }
    
    addView({
      name: saveViewName.trim(),
      filters: filtersToSave,
    });
    
    toast({
      title: "View saved",
      description: `Saved "${saveViewName.trim()}" view`,
    });
    
    setSaveViewName("");
    setSaveViewOpen(false);
  };

  const handleClearFilters = () => {
    setFilters({
      query: "",
      status: "all",
      hideArchived: true,
    });
    setDateFrom(undefined);
    setDateTo(undefined);
    clearCurrentView();
    setSelected([]);
  };

  const handleBulkExport = () => {
    if (selected.length === 0) return;
    
    const selectedRuns = runs.filter(r => selected.includes(r.runId));
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRuns: selectedRuns.length,
      runs: selectedRuns,
    };
    
    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nini-runs-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export completed",
        description: `Exported ${selected.length} runs successfully`,
      });
      
      setSelected([]);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export selected runs",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = () => {
    bulkDelete(selected);
    toast({
      title: "Runs deleted",
      description: `Deleted ${selected.length} runs successfully`,
    });
    setSelected([]);
  };

  const updateFilters = (updates: Partial<RepositoryFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    clearCurrentView();
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    updateFilters({ tags: newTags.length > 0 ? newTags : undefined });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dialog open={saveViewOpen} onOpenChange={setSaveViewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save View
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current View</DialogTitle>
                <DialogDescription>
                  Save the current filter configuration as a reusable view.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Enter view name..."
                  value={saveViewName}
                  onChange={e => setSaveViewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      handleSaveView();
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSaveViewOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveView} disabled={!saveViewName.trim()}>
                    Save View
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Select onValueChange={handleApplyView}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Apply View" />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg z-50">
              {savedViews.map(view => (
                <SelectItem key={view.id} value={view.id} className="hover:bg-muted">
                  <div className="flex items-center justify-between w-full">
                    <span>{view.name}</span>
                    {view.id === currentView && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        active
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced
            <ChevronDown className={cn("w-4 h-4 ml-1 transition-transform", showAdvancedFilters && "rotate-180")} />
          </Button>
        </div>

        {/* Bulk actions when items are selected */}
        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selected.length} selected
            </span>
            <Button variant="outline" size="sm" onClick={handleBulkExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Selected
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Runs</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selected.length} run(s)? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>
                    Delete {selected.length} Run(s)
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Basic Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input 
          placeholder="Search runs, tags, notes..." 
          value={filters.query} 
          onChange={e => updateFilters({ query: e.target.value })}
          className="w-[300px]" 
        />
        
        <Select value={filters.status || "all"} onValueChange={value => updateFilters({ status: value === "all" ? "all" : value as any })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="aborted">Aborted</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2">
          <Checkbox 
            checked={filters.hideArchived} 
            onCheckedChange={checked => updateFilters({ hideArchived: Boolean(checked) })}
          />
          <span className="text-sm">Hide archived</span>
        </label>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM dd") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border border-border shadow-lg z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        if (date && dateTo) {
                          updateFilters({
                            dateRange: {
                              start: date.toISOString(),
                              end: dateTo.toISOString(),
                            }
                          });
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM dd") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border border-border shadow-lg z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        if (dateFrom && date) {
                          updateFilters({
                            dateRange: {
                              start: dateFrom.toISOString(),
                              end: date.toISOString(),
                            }
                          });
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Approval Rate */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Min Approval Rate: {filters.approvalRateMin ?? 0}%
              </label>
              <Slider
                value={[filters.approvalRateMin ?? 0]}
                onValueChange={([value]) => updateFilters({ approvalRateMin: value })}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Tags Filter */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-1">
                {availableTags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No tags available</span>
                ) : (
                  availableTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={filters.tags?.includes(tag) ? "default" : "secondary"}
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Clear Advanced Filters */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                updateFilters({ 
                  dateRange: undefined, 
                  approvalRateMin: undefined, 
                  tags: undefined 
                });
              }}
            >
              Clear Advanced Filters
            </Button>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Run ID</th>
              <th className="p-2 text-left">Model</th>
              <th className="p-2 text-left">Mode</th>
              <th className="p-2 text-center">Scenarios</th>
              <th className="p-2 text-center">Avg Total</th>
              <th className="p-2 text-center">Avg Safety</th>
              <th className="p-2 text-center">Criticals</th>
              <th className="p-2 text-center">Approval</th>
              <th className="p-2 text-left">Tags</th>
              <th className="p-2 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map(r => (
              <tr key={r.runId} className="border-t hover:bg-muted/25">
                <td className="p-2">
                  <Checkbox
                    checked={selected.includes(r.runId)}
                    onCheckedChange={(checked) => handleSelectRow(r.runId, Boolean(checked))}
                  />
                </td>
                <td className="p-2">
                  {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString()}
                </td>
                <td className="p-2 font-mono text-xs">
                  <button 
                    onClick={() => handleOpenDetails(r.runId)}
                    className="text-primary hover:underline"
                  >
                    {r.runId.slice(0, 8)}...
                  </button>
                </td>
                <td className="p-2">{r.model ?? '-'}</td>
                <td className="p-2">
                  <Badge variant={r.simulationMode ? "secondary" : "default"}>
                    {r.simulationMode ? 'Simulation' : 'API'}
                  </Badge>
                </td>
                <td className="p-2 text-center">{r.scenarioCount ?? r.scenarioIds?.length ?? '-'}</td>
                <td className="p-2 text-center">
                  <Badge variant={r.metrics?.avgTotal >= 90 ? "default" : "secondary"}>
                    {Math.round(r.metrics?.avgTotal ?? 0)}
                  </Badge>
                </td>
                <td className="p-2 text-center">
                  <Badge variant={r.metrics?.avgSafety >= 95 ? "default" : "destructive"}>
                    {Math.round(r.metrics?.avgSafety ?? 0)}
                  </Badge>
                </td>
                <td className="p-2 text-center">
                  <Badge variant={r.metrics?.criticalIssues === 0 ? "default" : "destructive"}>
                    {r.metrics?.criticalIssues ?? 0}
                  </Badge>
                </td>
                <td className="p-2 text-center">
                  {Math.round((r.metrics?.approvalRate ?? 0) * 100)}%
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {(r.repo?.tags ?? []).slice(0, 3).map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                    {(r.repo?.tags?.length ?? 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(r.repo?.tags?.length ?? 0) - 3}
                      </Badge>
                    )}
                    {r.repo?.pinned && (
                      <Badge className="text-xs">
                        <Pin className="w-3 h-3 mr-1" />
                        baseline
                      </Badge>
                    )}
                    {r.repo?.archived && (
                      <Badge variant="outline" className="text-xs">
                        archived
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleOpenDetails(r.runId)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => nav(`/results?run=${r.runId}`)}
                      title="Open Results"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => togglePinned(r.runId)}
                      title={r.repo?.pinned ? 'Unpin' : 'Pin as baseline'}
                    >
                      <Pin className={`w-4 h-4 ${r.repo?.pinned ? 'fill-current' : ''}`} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setArchived(r.runId, !r.repo?.archived)}
                      title={r.repo?.archived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRuns.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={12}>
                  {filters.query || filters.status || filters.dateRange || filters.tags?.length || filters.approvalRateMin ? 
                    "No runs match the current filters." : 
                    "No runs found. Run some scenarios to see results here."
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <RunDetailsPanel 
        runId={selectedRunId}
        open={panelOpen}
        onClose={handleClosePanel}
      />
    </div>
  );
}