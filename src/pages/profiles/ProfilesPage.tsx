import { Plus, Eye, Edit, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfilesStore, UserAIProfile } from "@/store/profiles";
import { useEffect, useState } from "react";
import { ProfileEditor } from "./ProfileEditor";

function ProfileCard({ profile, onEdit }: { profile: UserAIProfile; onEdit: (id: string) => void }) {
  const { deleteProfile, duplicateProfile } = useProfilesStore();

  const handleView = () => {
    onEdit(profile.id);
  };

  const handleEdit = () => {
    onEdit(profile.id);
  };

  const handleDuplicate = () => {
    duplicateProfile(profile.id);
  };

  const handleDelete = () => {
    if (confirm(`¿Eliminar el perfil "${profile.name}"?`)) {
      deleteProfile(profile.id);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{profile.name}</CardTitle>
            <CardDescription className="mt-2">
              {profile.description}
            </CardDescription>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex-1"
            >
              <Eye className="h-3 w-3" />
              Ver
            </Button>
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

function ProfilesPage() {
  const { profiles, initializeMockData, loadFromStorage } = useProfilesStore();
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    // Load from storage first
    loadFromStorage();
    
    // If no profiles exist after loading, initialize with mock data
    setTimeout(() => {
      if (profiles.length === 0) {
        initializeMockData();
      }
    }, 0);
  }, [loadFromStorage, initializeMockData]);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">USERAI Profiles</h1>
          <p className="text-muted-foreground">
            Gestiona perfiles de personalidad para simulaciones de usuarios
          </p>
        </div>
        <Button onClick={handleNewProfile}>
          <Plus className="h-4 w-4" />
          Nuevo Perfil
        </Button>
      </div>

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
            <ProfileCard key={profile.id} profile={profile} onEdit={handleEditProfile} />
          ))}
        </div>
      )}

      <ProfileEditor
        profileId={editingProfileId || undefined}
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
      />
    </div>
  );
}

export default ProfilesPage;