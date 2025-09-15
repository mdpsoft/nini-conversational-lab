import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";

interface PersonalityTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function PersonalityTab({ data, errors, onChange }: PersonalityTabProps) {
  const [newTrait, setNewTrait] = useState("");

  const addTrait = () => {
    if (newTrait.trim() && data.traits.length < 10 && !data.traits.includes(newTrait.trim())) {
      onChange({
        traits: [...data.traits, newTrait.trim()]
      });
      setNewTrait("");
    }
  };

  const removeTrait = (index: number) => {
    onChange({
      traits: data.traits.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tone">Tono *</Label>
        <Input
          id="tone"
          value={data.tone}
          onChange={(e) => onChange({ tone: e.target.value })}
          placeholder="ej. empático y comprensivo, neutral y distante, intenso y apasionado"
          className={errors.tone ? "border-destructive" : ""}
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
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTrait}
            disabled={data.traits.length >= 10 || !newTrait.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.traits.map((trait, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {trait}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeTrait(index)}
              >
                <X className="h-3 w-3" />
              </Button>
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
          value={data.attachment_style} 
          onValueChange={(value: "anxious" | "avoidant" | "secure" | "fearful") => 
            onChange({ attachment_style: value })
          }
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
          onChange={(e) => onChange({ conflict_style: e.target.value })}
          placeholder="ej. evitativo, confrontativo, colaborativo"
        />
      </div>
    </div>
  );
}