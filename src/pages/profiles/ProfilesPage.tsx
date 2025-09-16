import { Plus, Eye, Edit, Copy, Trash2, Download, Upload, GitCompare, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAIProfile } from "@/store/profiles";
import { useEffect, useState } from "react";
import { ProfileEditor } from "./ProfileEditor";
import { RuntimePromptViewer } from "./RuntimePromptViewer";
import { ImportProfilesModal } from "./ImportProfilesModal";
import { CompareProfilesView } from "./CompareProfilesView";
import { SchemaErrorBanner } from '@/components/SchemaErrorBanner';
import { MigrationModal } from '@/components/MigrationModal';
import { useProfilesRepo } from "@/hooks/useProfilesRepo";
import { LocalProfilesRepo } from "@/data/useraiProfiles";
import { exportProfiles, downloadFile, generateExportFilename } from "@/utils/profileImportExport";
import { useToast } from "@/hooks/use-toast";
import { createEmptyProfile } from "@/utils/createEmptyProfile";

function ProfileCard({ 
  profile, 
  onEdit, 
  isSelected, 
  onToggleSelection,
  onDelete,
  onDuplicate
}: { 
  profile: UserAIProfile; 
  onEdit: (id: string) => void;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {

  const handleView = () => {
    onEdit(profile.id);
  };

  const handleEdit = () => {
    onEdit(profile.id);
  };

  const handleDuplicate = () => {
    onDuplicate(profile.id);
  };

  const handleDelete = () => {
    if (confirm(`¿Eliminar el perfil "${profile.name}"?`)) {
      onDelete(profile.id);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(profile.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <CardTitle className="text-lg">{profile.name}</CardTitle>
              <CardDescription className="mt-2">
                {profile.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="ml-2">
            v{profile.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {profile.traits.slice(0, 3).map((trait) => (
              <Badge key={trait} variant="secondary" className="text-xs">
                {trait}
              </Badge>
            ))}
            {profile.traits.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{profile.traits.length - 3}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <div>Estilo: {profile.attachment_style}</div>
            <div>Idioma: {profile.lang.toUpperCase()}</div>
            <div>Verbosidad: {profile.verbosity.paragraphs}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <RuntimePromptViewer profile={profile} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit className="h-3 w-3" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UpdatedProfilesPage() {
  const { 
    profiles, 
    dataSource, 
    loading, 
    error,
    schemaError,
    refreshProfiles,
    retrySchemaSetup,
    upsertProfile,
    removeProfile,
    bulkUpsertProfiles
  } = useProfilesRepo();
  
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [localProfiles, setLocalProfiles] = useState<UserAIProfile[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Check for local profiles when component mounts and when data source changes
    checkForLocalProfiles();
  }, [dataSource]);

  const checkForLocalProfiles = async () => {
    try {
      const localRepo = new LocalProfilesRepo();
      const localProfilesList = await localRepo.list();
      setLocalProfiles(localProfilesList);
    } catch (error) {
      console.error('Failed to check local profiles:', error);
    }
  };

  const handleNewProfile = () => {
    setEditingProfileId(null);
    setIsEditorOpen(true);
  };

  const handleEditProfile = (profileId: string) => {
    setEditingProfileId(profileId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingProfileId(null);
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await removeProfile(profileId);
      toast({
        title: "Profile deleted",
        description: "Profile has been removed successfully",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete profile",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateProfile = async (profileId: string) => {
    try {
      const profileToDuplicate = profiles.find(p => p.id === profileId);
      if (!profileToDuplicate) return;

      const timestamp = Date.now().toString();
      const newProfile = {
        ...profileToDuplicate,
        id: `userai.${profileToDuplicate.name.toLowerCase().replace(/\s+/g, '-')}-copy-${timestamp}.v${profileToDuplicate.version + 1}`,
        name: `${profileToDuplicate.name} (Copia)`,
        version: profileToDuplicate.version + 1,
      };

      await upsertProfile(newProfile);
      toast({
        title: "Profile duplicated",
        description: "Profile has been duplicated successfully",
      });
    } catch (error) {
      toast({
        title: "Duplicate failed",
        description: error instanceof Error ? error.message : "Failed to duplicate profile",
        variant: "destructive"
      });
    }
  };

  const handleExportSelected = () => {
    const selectedProfiles = profiles.filter(p => selectedProfileIds.includes(p.id));
    if (selectedProfiles.length === 0) return;

    const exportData = exportProfiles(selectedProfiles);
    const filename = generateExportFilename();
    downloadFile(exportData, filename);
    
    toast({
      title: "Profiles exported",
      description: `${selectedProfiles.length} profile(s) exported to ${filename}`,
    });
  };

  const handleImportProfiles = async (importedProfiles: UserAIProfile[]) => {
    try {
      await bulkUpsertProfiles(importedProfiles);
      toast({
        title: "Profiles imported",
        description: `${importedProfiles.length} profile(s) imported successfully`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import profiles",
        variant: "destructive"
      });
    }
  };

  const handleCompareProfiles = () => {
    setIsCompareViewOpen(true);
  };

  const handleMigrateFromLocal = () => {
    setIsMigrationModalOpen(true);
  };

  const handleMigrationComplete = () => {
    refreshProfiles();
    checkForLocalProfiles();
  };

  const toggleProfileSelection = (profileId: string) => {
    setSelectedProfileIds(current => {
      if (current.includes(profileId)) {
        return current.filter(id => id !== profileId);
      } else {
        return [...current, profileId];
      }
    });
  };

  const clearSelection = () => {
    setSelectedProfileIds([]);
  };

  const selectAll = () => {
    setSelectedProfileIds(profiles.map(p => p.id));
  };

  const selectedProfiles = profiles.filter(p => selectedProfileIds.includes(p.id));
  const canMigrateFromLocal = dataSource === 'Supabase' && localProfiles.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">USERAI Profiles</h1>
            <p className="text-muted-foreground">Loading profiles...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-64 animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">USERAI Profiles</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="destructive">Error</Badge>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
        <Card className="p-6 text-center border-destructive">
          <CardContent>
            <p className="text-destructive">Failed to load profiles: {error}</p>
            <Button onClick={refreshProfiles} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schema error banner */}
      {schemaError && (
        <SchemaErrorBanner onRetry={retrySchemaSetup} />
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">USERAI Profiles</h1>
            <Badge variant={dataSource === 'Supabase' ? 'default' : 'secondary'}>
              {dataSource}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Gestiona perfiles de personalidad para simulaciones de usuarios
          </p>
          {selectedProfileIds.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProfileIds.length} profile(s) selected
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Migration button */}
          {canMigrateFromLocal && (
            <Button 
              variant="outline" 
              onClick={handleMigrateFromLocal}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <CloudUpload className="h-4 w-4 mr-2" />
              Migrate from Local ({localProfiles.length})
            </Button>
          )}
          
          {/* Export/Import/Compare buttons */}
          <Button 
            variant="outline" 
            onClick={handleExportSelected}
            disabled={selectedProfileIds.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import JSON
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleCompareProfiles}
            disabled={selectedProfileIds.length < 2}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare ({selectedProfileIds.length})
          </Button>
          
          <Button onClick={handleNewProfile}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Perfil
          </Button>
        </div>
      </div>

      {/* Selection controls */}
      {profiles.length > 0 && (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={selectAll}
          >
            Select All
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearSelection}
            disabled={selectedProfileIds.length === 0}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {profiles.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <div className="text-muted-foreground">
              <p className="text-lg mb-2">No hay perfiles guardados</p>
              <p className="text-sm">Crea tu primer perfil USERAI para comenzar</p>
            </div>
            <Button className="mt-4" onClick={handleNewProfile}>
              <Plus className="h-4 w-4" />
              Crear Primer Perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard 
              key={profile.id} 
              profile={profile} 
              onEdit={handleEditProfile}
              onDelete={handleDeleteProfile}
              onDuplicate={handleDuplicateProfile}
              isSelected={selectedProfileIds.includes(profile.id)}
              onToggleSelection={toggleProfileSelection}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProfileEditor
        profileId={editingProfileId || undefined}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        initialProfile={!editingProfileId ? createEmptyProfile('es') : undefined}
      />

      <ImportProfilesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingProfiles={profiles}
        onImport={handleImportProfiles}
      />

      <CompareProfilesView
        isOpen={isCompareViewOpen}
        onClose={() => setIsCompareViewOpen(false)}
        profiles={selectedProfiles}
      />

      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        localProfiles={localProfiles}
        onMigrationComplete={handleMigrationComplete}
      />
    </div>
  );
}

export default UpdatedProfilesPage;