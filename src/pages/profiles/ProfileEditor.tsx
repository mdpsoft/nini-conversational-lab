import { useState, useEffect } from "react";
import { X, Save, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfilesStore, UserAIProfile } from "@/store/profiles";
import { OverviewTab } from "./tabs/OverviewTab";
import { PersonalityTab } from "./tabs/PersonalityTab";
import { FocusTab } from "./tabs/FocusTab";
import { BehaviorTab } from "./tabs/BehaviorTab";
import { SafetyTab } from "./tabs/SafetyTab";
import { JsonTab } from "./tabs/JsonTab";
import { ProfilePreview } from "./ProfilePreview";

interface ProfileEditorProps {
  profileId?: string;
  isOpen: boolean;
  onClose: () => void;
}

function generateId(name: string, version: number): string {
  const slug = name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `userai.${slug}.v${version}`;
}

export function ProfileEditor({ profileId, isOpen, onClose }: ProfileEditorProps) {
  const { profiles, addProfile, updateProfile, deleteProfile, duplicateProfile } = useProfilesStore();
  
  const [formData, setFormData] = useState<UserAIProfile>({
    id: "",
    name: "",
    description: "",
    lang: "es",
    tone: "",
    traits: [],
    attachment_style: "secure",
    conflict_style: "",
    emotions_focus: [],
    needs_focus: [],
    boundaries_focus: [],
    verbosity: {
      paragraphs: "unlimited",
      soft_char_limit: 1000,
      hard_char_limit: null,
    },
    question_rate: {
      min: 0,
      max: 2,
    },
    example_lines: [],
    safety: {
      ban_phrases: [],
      escalation: "remind_safety_protocol",
    },
    version: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!profileId;

  useEffect(() => {
    if (isOpen && profileId) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        setFormData(profile);
      }
    } else if (isOpen && !profileId) {
      // Reset form for new profile
      setFormData({
        id: "",
        name: "",
        description: "",
        lang: "es",
        tone: "",
        traits: [],
        attachment_style: "secure",
        conflict_style: "",
        emotions_focus: [],
        needs_focus: [],
        boundaries_focus: [],
        verbosity: {
          paragraphs: "unlimited",
          soft_char_limit: 1000,
          hard_char_limit: null,
        },
        question_rate: {
          min: 0,
          max: 2,
        },
        example_lines: [],
        safety: {
          ban_phrases: [],
          escalation: "remind_safety_protocol",
        },
        version: 1,
      });
    }
  }, [isOpen, profileId, profiles]);

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

  const handleSave = () => {
    if (!validateForm()) return;

    const profileToSave = { ...formData };
    
    if (!isEditing) {
      profileToSave.id = generateId(formData.name, formData.version);
      addProfile(profileToSave);
    } else {
      updateProfile(profileId!, profileToSave);
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`¿Eliminar el perfil "${formData.name}"?`)) {
      deleteProfile(profileId!);
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (profileId) {
      const newId = duplicateProfile(profileId);
      onClose();
      // Could potentially open the duplicated profile in editor
    }
  };

  const updateFormData = (updates: Partial<UserAIProfile>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar Perfil: ${formData.name}` : "Nuevo Perfil USERAI"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left side - Form */}
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="personality">Personality</TabsTrigger>
                <TabsTrigger value="focus">Focus</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="safety">Safety</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto mt-4">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab
                    data={formData}
                    errors={errors}
                    isEditing={isEditing}
                    onChange={updateFormData}
                  />
                </TabsContent>

                <TabsContent value="personality" className="mt-0">
                  <PersonalityTab
                    data={formData}
                    errors={errors}
                    onChange={updateFormData}
                  />
                </TabsContent>

                <TabsContent value="focus" className="mt-0">
                  <FocusTab
                    data={formData}
                    errors={errors}
                    onChange={updateFormData}
                  />
                </TabsContent>

                <TabsContent value="behavior" className="mt-0">
                  <BehaviorTab
                    data={formData}
                    errors={errors}
                    onChange={updateFormData}
                  />
                </TabsContent>

                <TabsContent value="safety" className="mt-0">
                  <SafetyTab
                    data={formData}
                    errors={errors}
                    onChange={updateFormData}
                  />
                </TabsContent>

                <TabsContent value="json" className="mt-0">
                  <JsonTab data={formData} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Right side - Preview */}
          <div className="w-80 flex-shrink-0">
            <ProfilePreview profile={formData} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
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
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4" />
              {isEditing ? "Guardar Cambios" : "Crear Perfil"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}