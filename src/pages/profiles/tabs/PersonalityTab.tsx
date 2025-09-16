import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Unlock, Lock } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";
import { getUserAIPresets, UserAIPresetId, presetToProfileFields } from "@/utils/useraiPresets";
import { coerceSelect } from "@/utils/selectUtils";

interface PersonalityTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function PersonalityTab({ data, errors, onChange }: PersonalityTabProps) {
  const [newTrait, setNewTrait] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(data.presetSource === 'custom');
  const presets = getUserAIPresets();

  const addTrait = () => {
    if (newTrait.trim() && data.traits.length < 10 && !data.traits.includes(newTrait.trim())) {
      onChange({
        traits: [...data.traits, newTrait.trim()],
        presetSource: 'custom'
      });
      setNewTrait("");
    }
  };

  const removeTrait = (index: number) => {
    onChange({
      traits: data.traits.filter((_, i) => i !== index),
      presetSource: 'custom'
    });
  };

  const handlePresetChange = (presetId: UserAIPresetId) => {
    const presetFields = presetToProfileFields(presetId, data.lang);
    
    onChange({
      personalityPreset: presetId,
      presetSource: 'preset',
      ...presetFields
    });
    
    setIsUnlocked(false);
  };

  const toggleUnlock = () => {
    const newUnlocked = !isUnlocked;
    setIsUnlocked(newUnlocked);
    
    if (newUnlocked) {
      onChange({ presetSource: 'custom' });
    }
  };

  const selectedPreset = presets.find(p => p.id === data.personalityPreset);
  const isPresetMode = data.presetSource === 'preset' && !isUnlocked;

  return (
    <div className="space-y-6">
      {/* Personality Preset Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Personality Preset</Label>
          {data.personalityPreset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleUnlock}
              className="flex items-center gap-2"
            >
              {isUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isUnlocked ? 'Bloqueado' : 'Desbloquear para personalizar'}
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset) => (
            <Card 
              key={preset.id}
              className={`cursor-pointer transition-colors ${
                data.personalityPreset === preset.id 
                  ? 'ring-2 ring-primary bg-primary/5' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handlePresetChange(preset.id)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-lg">{preset.icon}</span>
                  {preset.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs">
                  {preset.short}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {selectedPreset && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{selectedPreset.icon}</span>
              <Badge variant="secondary">{selectedPreset.name}</Badge>
              {data.presetSource === 'custom' && (
                <Badge variant="outline">Personalizado</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{selectedPreset.short}</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Preguntas: {selectedPreset.defaultQuestionRate.min}-{selectedPreset.defaultQuestionRate.max} por respuesta
            </div>
          </div>
        )}
      </div>

      {/* Derived Fields (read-only unless unlocked) */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="tone">Tono *</Label>
          <Input
            id="tone"
            value={data.tone}
            onChange={(e) => onChange({ tone: e.target.value, presetSource: 'custom' })}
            placeholder="ej. empático y comprensivo, neutral y distante, intenso y apasionado"
            className={errors.tone ? "border-destructive" : ""}
            disabled={isPresetMode}
          />
          {errors.tone && (
            <p className="text-xs text-destructive mt-1">{errors.tone}</p>
          )}
        </div>

        <div>
          <Label>Rasgos de Personalidad (máx. 10)</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              placeholder="Agregar rasgo..."
              onKeyPress={(e) => e.key === "Enter" && addTrait()}
              disabled={isPresetMode}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTrait}
              disabled={isPresetMode || data.traits.length >= 10 || !newTrait.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.traits.map((trait, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {trait}
                {!isPresetMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => removeTrait(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.traits.length}/10 rasgos
          </p>
        </div>

        <div>
          <Label htmlFor="attachment_style">Estilo de Apego</Label>
          <Select 
            value={coerceSelect(data.attachment_style)} 
            onValueChange={(value: "anxious" | "avoidant" | "secure" | "fearful" | "unset") => 
              onChange({ 
                attachment_style: value === 'unset' ? 'secure' : value as "anxious" | "avoidant" | "secure" | "fearful",
                presetSource: 'custom' 
              })
            }
            disabled={isPresetMode}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="secure">Seguro</SelectItem>
              <SelectItem value="anxious">Ansioso</SelectItem>
              <SelectItem value="avoidant">Evitativo</SelectItem>
              <SelectItem value="fearful">Desorganizado/Temeroso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="conflict_style">Estilo de Manejo de Conflictos</Label>
          <Input
            id="conflict_style"
            value={data.conflict_style}
            onChange={(e) => onChange({ conflict_style: e.target.value, presetSource: 'custom' })}
            placeholder="ej. evitativo, confrontativo, colaborativo"
            disabled={isPresetMode}
          />
        </div>
      </div>
    </div>
  );
}