import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAIProfile } from "@/store/profiles";

interface ProfilePreviewProps {
  profile: UserAIProfile;
}

function generatePreviewText(profile: UserAIProfile): string {
  const { lang, tone, traits, emotions_focus } = profile;
  
  // Sample traits and emotions for preview generation
  const sampleTrait = traits.length > 0 ? traits[0] : "general";
  const sampleEmotion = emotions_focus.length > 0 ? emotions_focus[0] : "neutral";
  
  if (lang === "es") {
    switch (tone.toLowerCase()) {
      case "empático":
      case "empathetic":
      case "empático y comprensivo":
        return `Entiendo que esta situación puede generar ${sampleEmotion}, y quiero que sepas que es completamente normal sentirse así. Muchas personas que tienden hacia ${sampleTrait} experimentan emociones similares. ¿Te gustaría que exploremos juntos algunas estrategias que podrían ayudarte?`;
      
      case "neutral":
      case "neutral y distante":
        return `Esta situación parece estar relacionada con patrones de ${sampleTrait}. Es importante mantener cierta perspectiva sobre ${sampleEmotion}. Considera evaluar las opciones disponibles de manera objetiva.`;
      
      case "intenso":
      case "intenso y apasionado":
        return `¡Esto es exactamente lo que necesitabas reconocer! El ${sampleEmotion} que sientes está conectado directamente con tu tendencia hacia ${sampleTrait}. ¡Es hora de tomar acción y cambiar esto de una vez por todas! ¿Estás listo para comprometerte realmente?`;
      
      default:
        return `Me parece que esta situación refleja aspectos de ${sampleTrait}, y el ${sampleEmotion} que describes es una respuesta comprensible. Veamos cómo podemos abordar esto de manera efectiva para tu bienestar.`;
    }
  } else {
    // English fallback
    switch (tone.toLowerCase()) {
      case "empathetic":
        return `I understand this situation might trigger ${sampleEmotion}, and I want you to know that it's completely normal to feel this way. Many people with ${sampleTrait} tendencies experience similar emotions. Would you like to explore some strategies together?`;
      
      case "neutral":
        return `This situation appears to be related to ${sampleTrait} patterns. It's important to maintain perspective regarding ${sampleEmotion}. Consider evaluating available options objectively.`;
      
      case "intense":
        return `This is exactly what you needed to recognize! The ${sampleEmotion} you're feeling is directly connected to your ${sampleTrait} tendency. It's time to take action and change this once and for all! Are you ready to truly commit?`;
      
      default:
        return `It seems this situation reflects aspects of ${sampleTrait}, and the ${sampleEmotion} you describe is an understandable response. Let's see how we can address this effectively for your wellbeing.`;
    }
  }
}

export function ProfilePreview({ profile }: ProfilePreviewProps) {
  const previewText = generatePreviewText(profile);
  
  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Vista Previa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm leading-relaxed">
            {previewText}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tono:</span>
            <span>{profile.tone || "Sin definir"}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Idioma:</span>
            <span>{profile.lang.toUpperCase()}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estilo:</span>
            <span className="capitalize">{profile.attachment_style}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Verbosidad:</span>
            <span className="capitalize">{profile.verbosity.paragraphs}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Preguntas:</span>
            <span>{profile.question_rate.min}-{profile.question_rate.max}</span>
          </div>
        </div>
        
        {profile.traits.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Rasgos:</div>
            <div className="flex flex-wrap gap-1">
              {profile.traits.slice(0, 4).map((trait) => (
                <Badge key={trait} variant="secondary" className="text-xs">
                  {trait}
                </Badge>
              ))}
              {profile.traits.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.traits.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {profile.emotions_focus.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2">Emociones:</div>
            <div className="flex flex-wrap gap-1">
              {profile.emotions_focus.slice(0, 3).map((emotion) => (
                <Badge key={emotion} variant="outline" className="text-xs">
                  {emotion}
                </Badge>
              ))}
              {profile.emotions_focus.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.emotions_focus.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}