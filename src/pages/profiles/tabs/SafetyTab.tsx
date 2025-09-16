import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";
import { coerceSelect } from "@/utils/selectUtils";

interface SafetyTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function SafetyTab({ data, errors, onChange }: SafetyTabProps) {
  const [newBanPhrase, setNewBanPhrase] = useState("");
  const [customEscalation, setCustomEscalation] = useState(
    typeof data.safety.escalation === "string" && 
    data.safety.escalation !== "remind_safety_protocol" && 
    data.safety.escalation !== "escalate_specialist" 
      ? data.safety.escalation 
      : ""
  );

  const addBanPhrase = () => {
    if (newBanPhrase.trim() && !data.safety.ban_phrases.includes(newBanPhrase.trim())) {
      onChange({
        safety: {
          ...data.safety,
          ban_phrases: [...data.safety.ban_phrases, newBanPhrase.trim()]
        }
      });
      setNewBanPhrase("");
    }
  };

  const removeBanPhrase = (index: number) => {
    onChange({
      safety: {
        ...data.safety,
        ban_phrases: data.safety.ban_phrases.filter((_, i) => i !== index)
      }
    });
  };

  const updateEscalation = (value: string) => {
    if (value === "custom") {
      onChange({
        safety: {
          ...data.safety,
          escalation: customEscalation
        }
      });
    } else {
      onChange({
        safety: {
          ...data.safety,
          escalation: value
        }
      });
    }
  };

  const updateCustomEscalation = (value: string) => {
    setCustomEscalation(value);
    if (data.safety.escalation !== "remind_safety_protocol" && 
        data.safety.escalation !== "escalate_specialist") {
      onChange({
        safety: {
          ...data.safety,
          escalation: value
        }
      });
    }
  };

  const isCustomEscalation = data.safety.escalation !== "remind_safety_protocol" && 
                            data.safety.escalation !== "escalate_specialist";

  return (
    <div className="space-y-6">
      <div>
        <Label>Frases Prohibidas</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Frases o palabras que este perfil no debería usar nunca
        </p>
        
        <div className="flex gap-2 mb-3">
          <Textarea
            value={newBanPhrase}
            onChange={(e) => setNewBanPhrase(e.target.value)}
            placeholder="ej. cálmate, no exageres, es tu culpa..."
            className="min-h-[60px]"
            onKeyPress={(e) => e.key === "Enter" && e.shiftKey === false && (e.preventDefault(), addBanPhrase())}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addBanPhrase}
            disabled={!newBanPhrase.trim()}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.safety.ban_phrases.map((phrase, index) => (
            <Badge key={index} variant="destructive" className="flex items-center gap-1">
              "{phrase}"
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent text-destructive-foreground"
                onClick={() => removeBanPhrase(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Protocolo de Escalación</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Qué hacer cuando se detecta una situación que requiere intervención
        </p>
        
        <Select 
          value={coerceSelect(isCustomEscalation ? "custom" : data.safety.escalation)}
          onValueChange={updateEscalation}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remind_safety_protocol">
              Recordar protocolo de seguridad
            </SelectItem>
            <SelectItem value="escalate_specialist">
              Escalar a especialista
            </SelectItem>
            <SelectItem value="custom">
              Personalizado...
            </SelectItem>
          </SelectContent>
        </Select>

        {(isCustomEscalation || data.safety.escalation === "custom") && (
          <div className="mt-3">
            <Label htmlFor="custom_escalation">Protocolo Personalizado</Label>
            <Textarea
              id="custom_escalation"
              value={customEscalation}
              onChange={(e) => updateCustomEscalation(e.target.value)}
              placeholder="Describe el protocolo personalizado de escalación..."
              className="min-h-[100px] mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}