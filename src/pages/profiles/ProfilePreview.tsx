import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UserAIProfile } from "@/store/profiles";
import { labelFor } from "@/utils/age";
import { getUserAIPresets } from "@/utils/useraiPresets";

interface ProfilePreviewProps {
  profile: UserAIProfile;
}

export function ProfilePreview({ profile }: ProfilePreviewProps) {
  const presets = getUserAIPresets();
  const selectedPreset = presets.find(p => p.id === profile.personalityPreset);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{profile.name}</h3>
        <p className="text-sm text-muted-foreground">{profile.description}</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {profile.lang === 'es' ? 'Español' : profile.lang === 'en' ? 'English' : profile.lang}
          </Badge>
          {profile.ageYears && (
            <Badge variant="outline">
              {profile.ageYears} años / {labelFor(profile.ageGroup)}
            </Badge>
          )}
          {profile.ageGroup && !profile.ageYears && (
            <Badge variant="outline">
              {labelFor(profile.ageGroup)}
            </Badge>
          )}
          {selectedPreset && (
            <Badge variant="outline">
              {selectedPreset.icon} {selectedPreset.name}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tono:</span>
            <p className="font-medium">{profile.tone}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Verbosidad:</span>
            <p className="font-medium">
              {profile.verbosity.paragraphs === 'concise' ? 'Conciso' : 'Sin límite'} 
              {profile.verbosity.soft_char_limit && ` (~${profile.verbosity.soft_char_limit} chars)`}
            </p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Preguntas:</span>
            <p className="font-medium">{profile.question_rate.min}-{profile.question_rate.max} por respuesta</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Apego:</span>
            <p className="font-medium">{
              profile.attachment_style === 'secure' ? 'Seguro' :
              profile.attachment_style === 'anxious' ? 'Ansioso' :
              profile.attachment_style === 'avoidant' ? 'Evitativo' : 'Desorganizado'
            }</p>
          </div>
        </div>

        {profile.traits.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Rasgos de Personalidad</h4>
            <div className="flex flex-wrap gap-1">
              {profile.traits.map((trait, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {profile.emotions_focus.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Enfoque Emocional</h4>
            <div className="flex flex-wrap gap-1">
              {profile.emotions_focus.map((emotion, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {emotion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {profile.needs_focus.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Necesidades</h4>
            <div className="flex flex-wrap gap-1">
              {profile.needs_focus.map((need, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {need}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}