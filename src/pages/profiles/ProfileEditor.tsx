import { useState, useEffect, Suspense } from "react";
import { X, Save, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAIProfile } from "@/store/profiles";
import { AutoTab } from "./tabs/AutoTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PersonalityTab } from "./tabs/PersonalityTab";
import { FocusTab } from "./tabs/FocusTab";
import { BehaviorTab } from "./tabs/BehaviorTab";
import { SafetyTab } from "./tabs/SafetyTab";
import { JsonTab } from "./tabs/JsonTab";
import { ProfilePreview } from "./ProfilePreview";
import { useProfilesRepo } from "@/hooks/useProfilesRepo";
import { useToast } from "@/hooks/use-toast";
import { createEmptyProfile } from "@/utils/createEmptyProfile";
import { clampAge, deriveAgeGroup, midpointFor, labelFor, AgeGroup } from "@/utils/age";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { presetToProfileFields } from "@/utils/profilePresets";

interface ProfileEditorProps {
  profileId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (profile: UserAIProfile) => Promise<void>;
  initialProfile?: UserAIProfile;
}

function generateId(name: string, version: number): string {
  const slug = name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `userai.${slug}.v${version}`;
}

export function ProfileEditor({ profileId, isOpen, onClose, onSave, initialProfile }: ProfileEditorProps) {
  const { profiles, upsertProfile, removeProfile } = useProfilesRepo();
  const { toast } = useToast();
  
  const getInitialProfile = (): UserAIProfile => {
    if (initialProfile) return initialProfile;
    if (profileId) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) return hydrateProfile(profile);
    }
    return createEmptyProfile('es');
  };

  const [formData, setFormData] = useState<UserAIProfile>(getInitialProfile());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!profileId;

  useEffect(() => {
    if (isOpen) {
      console.warn('[USERAI Editor] initializing with profile:', getInitialProfile());
      setFormData(getInitialProfile());
    }
  }, [isOpen, profileId, profiles, initialProfile]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La descripción es requerida";
    }

    if (!formData.tone.trim()) {
      newErrors.tone = "El tono es requerido";
    }

    if (formData.question_rate.max < formData.question_rate.min) {
      newErrors.question_rate = "El máximo debe ser mayor o igual al mínimo";
    }

    if (formData.verbosity.hard_char_limit !== null && 
        formData.verbosity.soft_char_limit !== null &&
        formData.verbosity.hard_char_limit < formData.verbosity.soft_char_limit) {
      newErrors.verbosity = "El límite duro debe ser mayor o igual al límite suave";
    }

    // Check unique ID for new profiles
    if (!isEditing) {
      const generatedId = generateId(formData.name, formData.version);
      if (profiles.some(p => p.id === generatedId)) {
        newErrors.name = "Ya existe un perfil con este nombre";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const profileToSave = { ...formData };
      
      if (!isEditing) {
        profileToSave.id = generateId(formData.name, formData.version);
      }
      
      if (onSave) {
        await onSave(profileToSave);
      } else {
        await upsertProfile(profileToSave);
      }
      
      toast({
        title: isEditing ? "Profile updated" : "Profile created",
        description: "Profile has been saved successfully",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profileId) return;
    
    if (confirm(`¿Eliminar el perfil "${formData.name}"?`)) {
      try {
        await removeProfile(profileId);
        toast({
          title: "Profile deleted",
          description: "Profile has been removed successfully",
        });
        onClose();
      } catch (error) {
        toast({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "Failed to delete profile",
          variant: "destructive"
        });
      }
    }
  };

  const handleDuplicate = async () => {
    if (!profileId) return;
    
    try {
      const timestamp = Date.now().toString();
      const newProfile = {
        ...formData,
        id: `userai.${formData.name.toLowerCase().replace(/\s+/g, '-')}-copy-${timestamp}.v${formData.version + 1}`,
        name: `${formData.name} (Copia)`,
        version: formData.version + 1,
      };
      
      await upsertProfile(newProfile);
      toast({
        title: "Profile duplicated",
        description: "Profile has been duplicated successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Duplicate failed",
        description: error instanceof Error ? error.message : "Failed to duplicate profile",
        variant: "destructive"
      });
    }
  };

  const updateFormData = (updates: Partial<UserAIProfile>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Auto-derive age group if age changes
      if ('ageYears' in updates && updates.ageYears !== prev.ageYears) {
        newData.ageGroup = deriveAgeGroup(updates.ageYears);
      }
      
      return newData;
    });
    
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  // Defensive profile hydration
  const hydrateProfile = (p: Partial<UserAIProfile>): UserAIProfile => {
    const base = createEmptyProfile(p.lang as any ?? 'es');
    return {
      ...base,
      ...p,
      // Clean up empty strings to null for select fields
      tone: p.tone === '' ? null : p.tone,
      conflict_style: p.conflict_style === '' ? null : p.conflict_style,
      personalityPreset: p.personalityPreset === null || p.personalityPreset === undefined ? null : p.personalityPreset,
      ageYears: p.ageYears != null ? clampAge(p.ageYears) : null,
      ageGroup: p.ageGroup ?? (p.ageYears != null ? deriveAgeGroup(p.ageYears) : null),
      presetSource: p.presetSource ?? (p.personalityPreset ? 'preset' : 'custom'),
    } as UserAIProfile;
  };

  // Safe profile check
  if (!formData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="p-6 text-red-600">
            No se pudo inicializar el perfil (profile=null). Intenta de nuevo.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[min(1200px,95vw)] h-[min(88vh,900px)] flex flex-col p-0">
        <ErrorBoundary componentName="ProfileEditor">
          
          <Suspense fallback={<div className="p-6 text-muted-foreground">Cargando editor…</div>}>
            <Tabs defaultValue="auto" className="flex-1 flex flex-col">
              
              {/* Header + Tabs */}
              <div className="shrink-0 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-6 py-3">
                <DialogHeader className="mb-4">
                  <DialogTitle>
                    {isEditing ? `Editar Perfil: ${formData.name}` : "Nuevo Perfil USERAI"}
                  </DialogTitle>
                </DialogHeader>

                <TabsList className="grid grid-cols-7 w-full">
                  <TabsTrigger value="auto">Auto</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="personality">Personality</TabsTrigger>
                  <TabsTrigger value="focus">Focus</TabsTrigger>
                  <TabsTrigger value="behavior">Behavior</TabsTrigger>
                  <TabsTrigger value="safety">Safety</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
              </div>

              {/* Body */}
              <div className="flex-1 px-6 py-4 overflow-hidden">
                <div className="h-full flex flex-col gap-4 md:flex-row md:gap-6 items-stretch">
                  {/* Left (form) */}
                  <div className="md:basis-2/3 min-w-0 overflow-hidden">
                    <div className="h-full overflow-y-auto pr-2">
                      <TabsContent value="auto" className="mt-0 space-y-6">
                        <AutoTab
                          data={formData}
                          errors={errors}
                          onChange={updateFormData}
                        />
                      </TabsContent>

                      <TabsContent value="overview" className="mt-0 space-y-6">
                        <OverviewTab
                          data={formData}
                          errors={errors}
                          isEditing={isEditing}
                          onChange={updateFormData}
                        />
                      </TabsContent>

                      <TabsContent value="personality" className="mt-0 space-y-6">
                        <PersonalityTab
                          data={formData}
                          errors={errors}
                          onChange={updateFormData}
                        />
                      </TabsContent>

                      <TabsContent value="focus" className="mt-0 space-y-6">
                        <FocusTab
                          data={formData}
                          errors={errors}
                          onChange={updateFormData}
                        />
                      </TabsContent>

                      <TabsContent value="behavior" className="mt-0 space-y-6">
                        <BehaviorTab
                          data={formData}
                          errors={errors}
                          onChange={updateFormData}
                        />
                      </TabsContent>

                      <TabsContent value="safety" className="mt-0 space-y-6">
                        <SafetyTab
                          data={formData}
                          errors={errors}
                          onChange={updateFormData}
                        />
                      </TabsContent>

                      <TabsContent value="json" className="mt-0 space-y-6">
                        <JsonTab data={formData} />
                      </TabsContent>
                    </div>
                  </div>

                  {/* Right (preview) */}
                  <aside className="md:basis-1/3 min-w-0">
                    <div className="md:sticky md:top-3 max-h-[calc(88vh-160px)] overflow-y-auto">
                      <ProfilePreview profile={formData} />
                    </div>
                  </aside>
                </div>
              </div>
              
            </Tabs>
          </Suspense>

          {/* Footer */}
          <div className="shrink-0 border-t bg-white px-6 py-3">
            <div className="flex justify-between">
              <div className="flex gap-2">
                {isEditing && (
                  <>
                    <Button variant="outline" onClick={handleDuplicate}>
                      <Copy className="h-4 w-4" />
                      Duplicar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Perfil"}
                </Button>
              </div>
            </div>
          </div>

        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}