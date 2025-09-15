import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";

interface BehaviorTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function BehaviorTab({ data, errors, onChange }: BehaviorTabProps) {
  const [newExampleLine, setNewExampleLine] = useState("");

  const addExampleLine = () => {
    if (newExampleLine.trim()) {
      onChange({
        example_lines: [...data.example_lines, newExampleLine.trim()]
      });
      setNewExampleLine("");
    }
  };

  const removeExampleLine = (index: number) => {
    onChange({
      example_lines: data.example_lines.filter((_, i) => i !== index)
    });
  };

  const updateVerbosity = (updates: Partial<UserAIProfile["verbosity"]>) => {
    onChange({
      verbosity: { ...data.verbosity, ...updates }
    });
  };

  const updateQuestionRate = (updates: Partial<UserAIProfile["question_rate"]>) => {
    onChange({
      question_rate: { ...data.question_rate, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Verbosidad</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Párrafos</Label>
            <Select 
              value={data.verbosity.paragraphs} 
              onValueChange={(value: "unlimited" | "concise") => 
                updateVerbosity({ paragraphs: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">Sin límite</SelectItem>
                <SelectItem value="concise">Conciso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="soft_char_limit">Límite Suave de Caracteres</Label>
            <Input
              id="soft_char_limit"
              type="number"
              min="0"
              value={data.verbosity.soft_char_limit || ""}
              onChange={(e) => 
                updateVerbosity({ 
                  soft_char_limit: e.target.value ? parseInt(e.target.value) : null 
                })
              }
              placeholder="1000"
            />
          </div>

          <div>
            <Label htmlFor="hard_char_limit">Límite Duro de Caracteres</Label>
            <Input
              id="hard_char_limit"
              type="number"
              min="0"
              value={data.verbosity.hard_char_limit || ""}
              onChange={(e) => 
                updateVerbosity({ 
                  hard_char_limit: e.target.value ? parseInt(e.target.value) : null 
                })
              }
              placeholder="Opcional"
            />
            {errors.verbosity && (
              <p className="text-xs text-destructive mt-1">{errors.verbosity}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Tasa de Preguntas</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="question_rate_min">Mínimo</Label>
            <Input
              id="question_rate_min"
              type="number"
              min="0"
              value={data.question_rate.min}
              onChange={(e) => 
                updateQuestionRate({ min: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <Label htmlFor="question_rate_max">Máximo</Label>
            <Input
              id="question_rate_max"
              type="number"
              min="0"
              value={data.question_rate.max}
              onChange={(e) => 
                updateQuestionRate({ max: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        {errors.question_rate && (
          <p className="text-xs text-destructive mt-1">{errors.question_rate}</p>
        )}
      </div>

      <div>
        <Label>Líneas de Ejemplo</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea
              value={newExampleLine}
              onChange={(e) => setNewExampleLine(e.target.value)}
              placeholder="Línea de ejemplo típica del perfil..."
              className="min-h-[60px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addExampleLine}
              disabled={!newExampleLine.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {data.example_lines.map((line, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 p-3 bg-muted rounded text-sm">
                  "{line}"
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExampleLine(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}