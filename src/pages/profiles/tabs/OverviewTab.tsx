import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAIProfile } from "@/store/profiles";

interface OverviewTabProps {
  data: UserAIProfile;
  errors: Record<string, string>;
  isEditing: boolean;
  onChange: (updates: Partial<UserAIProfile>) => void;
}

export function OverviewTab({ data, errors, isEditing, onChange }: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="id">ID</Label>
        <Input
          id="id"
          value={data.id}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {isEditing ? "ID asignado automáticamente" : "Se generará automáticamente: userai.[nombre-slug].v[version]"}
        </p>
      </div>

      <div>
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Descripción *</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="1-2 oraciones describiendo la personalidad"
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1">{errors.description}</p>
        )}
      </div>

      <div>
        <Label htmlFor="lang">Idioma</Label>
        <Select value={data.lang} onValueChange={(value) => onChange({ lang: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="version">Versión</Label>
        <Input
          id="version"
          type="number"
          min="1"
          value={data.version}
          onChange={(e) => onChange({ version: parseInt(e.target.value) || 1 })}
        />
      </div>
    </div>
  );
}