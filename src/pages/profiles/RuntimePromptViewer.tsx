import { useState } from "react";
import { Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAIProfile } from "@/store/profiles";
import { buildUserAIPrompt, UserAISeed, UserAIBeat, UserAIMemory } from "@/core/userai/promptBuilder";

interface RuntimePromptViewerProps {
  profile: UserAIProfile;
}

export function RuntimePromptViewer({ profile }: RuntimePromptViewerProps) {
  const [copied, setCopied] = useState(false);

  // Sample runtime data for preview
  const sampleSeed: UserAISeed = {
    text: "Siento que necesito pasos claros para manejar la situación con mi pareja..."
  };

  const sampleBeat: UserAIBeat = {
    name: "tension",
    index: 3,
    total: 8
  };

  const sampleMemory: UserAIMemory = {
    facts: [
      "Usuario mencionó problemas de comunicación",
      "Expresó ansiedad sobre la relación",
      "Busca estrategias prácticas"
    ]
  };

  const runtimePrompt = buildUserAIPrompt(
    profile,
    sampleSeed,
    sampleBeat,
    sampleMemory,
    { allowSoftLimit: true, defaultSoftLimit: 1000 }
  );

  const copyToClipboard = () => {
    navigator.clipboard.writeText(runtimePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-3 w-3" />
          Runtime Prompt
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Runtime Prompt Preview: {profile.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Este es el prompt que se generará en runtime cuando este perfil sea usado en una conversación.
            Incluye datos de ejemplo para el seed, beat y memoria.
          </div>

          <ScrollArea className="h-[60vh] w-full rounded border">
            <div className="p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {runtimePrompt}
              </pre>
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground space-y-1">
            <div><strong>Datos de ejemplo utilizados:</strong></div>
            <div>• Seed: "{sampleSeed.text}"</div>
            <div>• Beat: {sampleBeat.name} ({sampleBeat.index}/{sampleBeat.total})</div>
            <div>• Memoria: {sampleMemory.facts.length} hechos relevantes</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}