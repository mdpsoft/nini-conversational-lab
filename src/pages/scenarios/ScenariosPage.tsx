import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, Download, Copy, Trash2, Search, Filter } from "lucide-react";
import { useScenariosStore } from "../../store/scenarios";
import { Scenario, getRelationshipTypeLabel, getRelationshipTypeOptions } from "../../types/scenario";
import { exportScenarios, importJsonFile, validateFileType, validateFileSize } from "../../utils/export";
import { useToast } from "@/hooks/use-toast";

export default function ScenariosPage() {
  const {
    scenarios,
    selectedIds,
    addScenario,
    updateScenario,
    deleteScenarios,
    duplicateScenario,
    setSelectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    importScenarios,
    exportScenarios: exportSelected,
    initializeDemoData,
  } = useScenariosStore();

  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewScenario, setIsNewScenario] = useState(false);

  const filteredScenarios = useMemo(() => {
    return scenarios.filter(scenario => {
      const matchesSearch = scenario.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (scenario.relationshipType && getRelationshipTypeLabel(scenario.relationshipType).toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLanguage = languageFilter === "all" || scenario.language === languageFilter;
      const matchesRelationship = relationshipFilter === "all" || scenario.relationshipType === relationshipFilter;
      
      return matchesSearch && matchesLanguage && matchesRelationship;
    });
  }, [scenarios, searchQuery, languageFilter, relationshipFilter]);

  const handleNewScenario = () => {
    const newScenario: Omit<Scenario, 'id'> = {
      name: "New Scenario",
      language: "es",
      relationshipType: null,
      crisisSignals: null,
      goals: ["Provide helpful guidance"],
      seedTurns: "Tell me what's happening...",
    };
    
    setEditingScenario({ ...newScenario, id: "" } as Scenario);
    setIsNewScenario(true);
    setIsEditDialogOpen(true);
  };

  const handleEditScenario = (scenario: Scenario) => {
    setEditingScenario({ ...scenario });
    setIsNewScenario(false);
    setIsEditDialogOpen(true);
  };

  const handleSaveScenario = () => {
    if (!editingScenario) return;

    if (isNewScenario) {
      const { id, ...scenarioData } = editingScenario;
      addScenario(scenarioData);
      toast({ title: "Scenario created", description: "New scenario has been added" });
    } else {
      const { id, ...updates } = editingScenario;
      updateScenario(id, updates);
      toast({ title: "Scenario updated", description: "Scenario has been saved" });
    }

    setIsEditDialogOpen(false);
    setEditingScenario(null);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file, ['json'])) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JSON file",
        variant: "destructive",
      });
      return;
    }

    if (!validateFileSize(file)) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await importJsonFile(file);
      const result = importScenarios(Array.isArray(data) ? data : [data]);
      
      toast({
        title: "Import completed",
        description: `${result.success} scenarios imported successfully${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ''}`,
      });
      
      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import scenarios",
        variant: "destructive",
      });
    }
    
    // Reset input
    event.target.value = "";
  };

  // Fix the export issue by converting to legacy format for compatibility
  const handleExport = () => {
    const scenariosToExport = exportSelected(selectedIds);
    // Convert to legacy format for export compatibility 
    const legacyFormat = scenariosToExport.map(scenario => ({
      ...scenario,
      topic: scenario.relationshipType ? getRelationshipTypeLabel(scenario.relationshipType) : 'unknown',
      attachment_style: 'secure', // Default for compatibility
      crisis_signals: scenario.crisisSignals || 'none'
    }));
    exportScenarios(legacyFormat as any);
    toast({
      title: "Export completed",
      description: `${scenariosToExport.length} scenarios exported`,
    });
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    
    deleteScenarios(selectedIds);
    toast({
      title: "Scenarios deleted",
      description: `${selectedIds.length} scenarios removed`,
    });
  };

  if (scenarios.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">No Scenarios</h1>
          <p className="text-muted-foreground mb-6">
            Get started by creating your first scenario or loading demo data.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={initializeDemoData}>
              Load Demo Scenarios
            </Button>
            <Button variant="outline" onClick={handleNewScenario}>
              <Plus className="mr-2 h-4 w-4" />
              New Scenario
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Scenarios</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleNewScenario}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
          
          <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />

          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={selectedIds.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export ({selectedIds.length})
          </Button>

          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {getRelationshipTypeOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Scenarios ({filteredScenarios.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.length === filteredScenarios.length && filteredScenarios.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    selectAll();
                  } else {
                    clearSelection();
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Relationship Type</TableHead>
                <TableHead>Crisis Level</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScenarios.map((scenario) => (
                <TableRow key={scenario.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(scenario.id)}
                      onCheckedChange={() => toggleSelected(scenario.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{scenario.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{scenario.language}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {scenario.relationshipType ? getRelationshipTypeLabel(scenario.relationshipType) : "—"}
                    </Badge>
                    {!scenario.relationshipType && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Edit to set relationship type
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        scenario.crisisSignals === 'clear' ? 'destructive' :
                        scenario.crisisSignals === 'ambiguous' ? 'secondary' :
                        'outline'
                      }
                    >
                      {scenario.crisisSignals || 'none'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {scenario.goals && scenario.goals.length > 0 ? (
                        <div className="text-sm">
                          {scenario.goals.slice(0, 2).map((goal, idx) => (
                            <Badge key={idx} variant="outline" className="mr-1 mb-1">
                              {goal}
                            </Badge>
                          ))}
                          {scenario.goals.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{scenario.goals.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditScenario(scenario)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateScenario(scenario.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isNewScenario ? "Create New Scenario" : "Edit Scenario"}
            </DialogTitle>
          </DialogHeader>
          
          {editingScenario && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingScenario.name}
                    onChange={(e) => setEditingScenario({
                      ...editingScenario,
                      name: e.target.value
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={editingScenario.language}
                    onValueChange={(value: any) => setEditingScenario({
                      ...editingScenario,
                      language: value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="relationshipType">Relationship Type</Label>
                  <Select
                    value={editingScenario.relationshipType || ""}
                    onValueChange={(value) => setEditingScenario({
                      ...editingScenario,
                      relationshipType: value as any
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRelationshipTypeOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crisisSignals">Crisis Level</Label>
                  <Select
                    value={editingScenario.crisisSignals || "none"}
                    onValueChange={(value) => setEditingScenario({
                      ...editingScenario,
                      crisisSignals: value === "none" ? null : value
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="ambiguous">Ambiguous</SelectItem>
                      <SelectItem value="clear">Clear</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Crisis level of the situation (not the user's profile)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seedTurns">Seed Turns</Label>
                <Textarea
                  id="seedTurns"
                  value={editingScenario.seedTurns || ''}
                  onChange={(e) => setEditingScenario({
                    ...editingScenario,
                    seedTurns: e.target.value
                  })}
                  rows={3}
                  placeholder="Enter initial conversation turns..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Goals</Label>
                <Textarea
                  id="goals"
                  value={editingScenario.goals?.join('\n') || ''}
                  onChange={(e) => setEditingScenario({
                    ...editingScenario,
                    goals: e.target.value.split('\n').filter(line => line.trim())
                  })}
                  rows={2}
                  placeholder="Enter goals, one per line..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveScenario}>
                  {isNewScenario ? "Create" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}