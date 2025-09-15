import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";

interface FocusTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function FocusTab({ data, errors, onChange }: FocusTabProps) {
  const [newEmotion, setNewEmotion] = useState("");
  const [newNeed, setNewNeed] = useState("");
  const [newBoundary, setNewBoundary] = useState("");

  const addToArray = (
    array: string[], 
    newValue: string, 
    setter: (value: string) => void,
    key: keyof Pick<UserAIProfile, "emotions_focus" | "needs_focus" | "boundaries_focus">
  ) => {
    if (newValue.trim() && !array.includes(newValue.trim())) {
      onChange({
        [key]: [...array, newValue.trim()]
      });
      setter("");
    }
  };

  const removeFromArray = (
    array: string[], 
    index: number,
    key: keyof Pick<UserAIProfile, "emotions_focus" | "needs_focus" | "boundaries_focus">
  ) => {
    onChange({
      [key]: array.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Emociones en Foco</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newEmotion}
            onChange={(e) => setNewEmotion(e.target.value)}
            placeholder="ej. anxiety, anger, sadness..."
            onKeyPress={(e) => e.key === "Enter" && addToArray(data.emotions_focus, newEmotion, setNewEmotion, "emotions_focus")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addToArray(data.emotions_focus, newEmotion, setNewEmotion, "emotions_focus")}
            disabled={!newEmotion.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.emotions_focus.map((emotion, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {emotion}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFromArray(data.emotions_focus, index, "emotions_focus")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Necesidades en Foco</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newNeed}
            onChange={(e) => setNewNeed(e.target.value)}
            placeholder="ej. validation, autonomy, security..."
            onKeyPress={(e) => e.key === "Enter" && addToArray(data.needs_focus, newNeed, setNewNeed, "needs_focus")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addToArray(data.needs_focus, newNeed, setNewNeed, "needs_focus")}
            disabled={!newNeed.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.needs_focus.map((need, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {need}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFromArray(data.needs_focus, index, "needs_focus")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Límites en Foco</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newBoundary}
            onChange={(e) => setNewBoundary(e.target.value)}
            placeholder="ej. difficulty-setting, rigid, flexible..."
            onKeyPress={(e) => e.key === "Enter" && addToArray(data.boundaries_focus, newBoundary, setNewBoundary, "boundaries_focus")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addToArray(data.boundaries_focus, newBoundary, setNewBoundary, "boundaries_focus")}
            disabled={!newBoundary.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.boundaries_focus.map((boundary, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {boundary}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeFromArray(data.boundaries_focus, index, "boundaries_focus")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}