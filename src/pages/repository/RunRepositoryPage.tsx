import { useRunsStore } from "@/store/runs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Pin, Archive, Trash2, Download, Eye } from "lucide-react";
import { RunDetailsPanel } from "./RunDetailsPanel";

export default function RunRepositoryPage() {
  const { runs, bulkDelete, setArchived, togglePinned } = useRunsStore();
  const [query, setQuery] = useState("");
  const [hideArchived, setHideArchived] = useState(true);
  const [status, setStatus] = useState<"" | "completed" | "failed" | "aborted">("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const nav = useNavigate();

  const rows = useMemo(() => {
    return runs
      .filter(r => (hideArchived ? !r.repo?.archived : true))
      .filter(r => (status ? r.status === status : true))
      .filter(r => {
        const hay = (s?: string) => (s ?? "").toLowerCase().includes(query.toLowerCase());
        const tags = (r.repo?.tags ?? []).join(" ");
        const notes = r.repo?.notes ?? "";
        return hay(r.runId) || hay(tags) || hay(notes);
      })
      .sort((a, b) => (b.createdAt.localeCompare(a.createdAt)));
  }, [runs, query, hideArchived, status]);

  const allChecked = selected.length > 0 && selected.length === rows.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(rows.map(r => r.runId));
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input 
          placeholder="Search run id, tag, note…" 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          className="w-[300px]" 
        />
        <select 
          value={status} 
          onChange={e => setStatus(e.target.value as any)} 
          className="border rounded px-2 py-1 h-9 bg-background"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="aborted">Aborted</option>
        </select>
        <label className="flex items-center gap-2 ml-2">
          <Checkbox 
            checked={hideArchived} 
            onCheckedChange={v => setHideArchived(Boolean(v))} 
          />
          <span>Hide archived</span>
        </label>
        <div className="ml-auto flex gap-2">
          <Button 
            variant="destructive" 
            disabled={!selected.length} 
            onClick={() => {
              bulkDelete(selected);
              setSelected([]);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button 
            variant="secondary" 
            disabled={!selected.length} 
            onClick={() => {
              selected.forEach(id => setArchived(id, true));
              setSelected([]);
            }}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </Button>
          <Button 
            variant="secondary" 
            disabled={!selected.length} 
            onClick={() => {
              selected.forEach(id => setArchived(id, false));
              setSelected([]);
            }}
          >
            Unarchive
          </Button>
        </div>
      </div>

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
              <th className="p-2 w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.runId} className="border-t hover:bg-muted/25">
                <td className="p-2">
                  <Checkbox
                    checked={selected.includes(r.runId)}
                    onCheckedChange={(v) => handleSelectRow(r.runId, Boolean(v))}
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
            {rows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={12}>
                  No runs found. Run some scenarios to see results here.
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