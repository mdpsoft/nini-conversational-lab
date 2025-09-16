import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Unlock } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";
import { 
  getUserAIPresets, 
  presetToProfileFields, 
  UserAIPresetId
} from "@/utils/useraiPresets";
import { AgeGroup, clampAge, deriveAgeGroup, midpointFor, labelFor, ageGroupOptions } from "@/utils/age";
import { useToast } from "@/hooks/use-toast";
import { coerceSelect, isUnset } from "@/utils/selectUtils";

interface AutoTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function AutoTab({ data, errors, onChange }: AutoTabProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { toast } = useToast();
  const presets = getUserAIPresets();

  const onAgeChange = (v: string) => {
    const n = clampAge(parseInt(v, 10));
    onChange({
      ageYears: n,
      ageGroup: n != null ? (deriveAgeGroup(n) as AgeGroup | null) : null,
    });
  };

  const onAgeGroupChange = (g: AgeGroup | 'unset') => {
    if (g === 'unset') {
      onChange({ ageGroup: null });
    } else {
      onChange({
        ageGroup: g,
        ageYears: midpointFor(g), // sincronizamos hacia edad
      });
    }
  };

  const handlePresetChange = (presetId: UserAIPresetId) => {
    const presetFields = presetToProfileFields(presetId, data.lang);
    
    onChange({
      personalityPreset: presetId,
      presetSource: 'preset',
      ...presetFields
    });
  };

  const handleGenerate = () => {
    // Use safe defaults if personalityPreset is unset
    const presetId = isUnset(data.personalityPreset) || !data.personalityPreset
      ? 'anxious_dependent' as UserAIPresetId
      : data.personalityPreset as UserAIPresetId;
    
    try {
      const presetFields = presetToProfileFields(presetId, data.lang);
      
      onChange({
        personalityPreset: presetId,
        presetSource: 'preset',
        ...presetFields
      });
      
      toast({
        title: "Profile generated",
        description: "All tabs have been populated with preset values"
      });
    } catch (error) {
      toast({
        title: "No se pudo aplicar el preset",
        description: error instanceof Error ? error.message : "Failed to generate profile",
        variant: "destructive"
      });
      console.error('[USERAI preset apply error]', error);
    }
  };

  const selectedPreset = presets.find(p => p.id === data.personalityPreset);

  return (
    <div className="min-h-[540px] max-h-[70vh] overflow-y-auto space-y-6">
      {/* Language */}
      <div>
        <Label htmlFor="auto-lang">Idioma</Label>
        <Select value={data.lang} onValueChange={(value) => onChange({ lang: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Age */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="age-years">Edad (13-99)</Label>
          <Input
            id="age-years"
            type="number"
            min="13"
            max="99"
            value={data.ageYears || ''}
            onChange={(e) => onAgeChange(e.target.value)}
            placeholder="Opcional"
            className={errors.ageYears ? "border-destructive" : ""}
          />
          {errors.ageYears && (
            <p className="text-xs text-destructive mt-1">{errors.ageYears}</p>
          )}
        </div>

        <div>
          <Label htmlFor="age-group">Rango Etario</Label>
          <Select 
            value={data.ageGroup ?? 'unset'} 
            onValueChange={(val) => onAgeGroupChange(val as AgeGroup | 'unset')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">— (ninguno)</SelectItem>
              {ageGroupOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

        {/* Personality Preset */}
      <div>
        <Label>Perfil de Personalidad</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
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
            </div>
            <p className="text-sm text-muted-foreground">{selectedPreset.short}</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Preguntas: {selectedPreset.defaultQuestionRate.min}-{selectedPreset.defaultQuestionRate.max} por respuesta
            </div>
          </div>
        )}
      </div>


      {/* Quick Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Verbosidad</Label>
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant={data.verbosity.paragraphs === 'concise' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({
                verbosity: {
                  ...data.verbosity,
                  paragraphs: 'concise',
                  soft_char_limit: 400,
                  hard_char_limit: 600
                }
              })}
              disabled={!isUnlocked && data.presetSource === 'preset'}
            >
              Bajo
            </Button>
            <Button
              type="button"
              variant={
                data.verbosity.paragraphs === 'unlimited' && 
                data.verbosity.soft_char_limit && 
                data.verbosity.soft_char_limit <= 800 ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => onChange({
                verbosity: {
                  ...data.verbosity,
                  paragraphs: 'unlimited',
                  soft_char_limit: 800,
                  hard_char_limit: null
                }
              })}
              disabled={!isUnlocked && data.presetSource === 'preset'}
            >
              Medio
            </Button>
            <Button
              type="button"
              variant={
                data.verbosity.paragraphs === 'unlimited' && 
                (!data.verbosity.soft_char_limit || data.verbosity.soft_char_limit > 800) ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => onChange({
                verbosity: {
                  ...data.verbosity,
                  paragraphs: 'unlimited',
                  soft_char_limit: 1200,
                  hard_char_limit: null
                }
              })}
              disabled={!isUnlocked && data.presetSource === 'preset'}
            >
              Alto
            </Button>
          </div>
        </div>

        <div>
          <Label>Tasa de Preguntas</Label>
          <div className="flex gap-2 mt-1 items-center">
            <Input
              type="number"
              min="0"
              max="5"
              value={data.question_rate.min}
              onChange={(e) => onChange({
                question_rate: {
                  ...data.question_rate,
                  min: parseInt(e.target.value, 10) || 0
                }
              })}
              className="w-16"
              disabled={!isUnlocked && data.presetSource === 'preset'}
            />
            <span className="text-sm text-muted-foreground">-</span>
            <Input
              type="number"
              min="0"
              max="5"
              value={data.question_rate.max}
              onChange={(e) => onChange({
                question_rate: {
                  ...data.question_rate,
                  max: parseInt(e.target.value, 10) || 1
                }
              })}
              className="w-16"
              disabled={!isUnlocked && data.presetSource === 'preset'}
            />
            {data.presetSource === 'preset' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsUnlocked(!isUnlocked);
                  if (!isUnlocked) {
                    onChange({ presetSource: 'custom' });
                  }
                }}
              >
                <Unlock className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="border-t pt-4">
        <Button 
          onClick={handleGenerate} 
          className="w-full"
          disabled={!data.personalityPreset}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Generar Perfil Completo
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Esto llenará automáticamente todas las pestañas basándose en tu configuración
        </p>
      </div>
    </div>
  );
}