import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getBeatDescription } from "@/core/userai/beatScheduler";
import type { Beat } from "@/core/userai/beatScheduler";
import type { UserAIMemory } from "@/core/userai/promptBuilder";
import type { TranscriptTurn } from "@/core/userai/memoryExtractor";
import type { PostProcessMeta } from "@/core/userai/responsePostProcessor";

interface RuntimeDebugPanelProps {
  beat?: Beat;
  memory?: UserAIMemory;
  transcript?: TranscriptTurn[];
  postProcess?: PostProcessMeta;
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
}

export function RuntimeDebugPanel({
  beat,
  memory,
  transcript,
  postProcess,
  isVisible = false,
  onToggle
}: RuntimeDebugPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!beat || !memory) return null;

  const copyToClipboard = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const beatContent = `Beat: ${getBeatDescription(beat, 'es')}\nNext Beat: ${beat.index < beat.total ? getBeatDescription({ ...beat, index: beat.index + 1 }, 'es') : 'Final'}`;
  
  const memoryContent = memory.facts.length > 0 
    ? memory.facts.map(fact => `• ${fact}`).join('\n')
    : 'Sin hechos relevantes';

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Runtime Debug</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle?.(!isVisible)}
            className="h-auto p-1"
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <Collapsible open={isVisible} onOpenChange={onToggle}>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Beat Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Beat Narrativo</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(beatContent, 'beat')}
                  className="h-auto p-1"
                >
                  {copied === 'beat' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              
              <div className="bg-muted/50 p-3 rounded text-xs font-mono">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {beat.name}
                  </Badge>
                  <span className="text-muted-foreground">
                    ({beat.index}/{beat.total})
                  </span>
                </div>
                {beat.index < beat.total && (
                  <div className="text-muted-foreground">
                    Próximo: {getBeatDescription({ ...beat, index: beat.index + 1 }, 'es')}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Memory Facts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Memoria Breve ({memory.facts.length}/5)
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(memoryContent, 'memory')}
                  className="h-auto p-1"
                >
                  {copied === 'memory' ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
              
              <ScrollArea className="max-h-32">
                <div className="bg-muted/50 p-3 rounded text-xs">
                  {memory.facts.length > 0 ? (
                    <ul className="space-y-1">
                      {memory.facts.map((fact, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-muted-foreground">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted-foreground italic">
                      Sin hechos relevantes
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Post-Processing Info */}
            {postProcess && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Post-Procesamiento</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(
                        `Early-Closure: ${postProcess.earlyClosureDetected ? 'detectado' : 'ninguno'} ${postProcess.strategy ? `(${postProcess.strategy})` : ''}\nQ-Rate: ${postProcess.questionCountBefore}→${postProcess.questionCountAfter}`,
                        'postprocess'
                      )}
                      className="h-auto p-1"
                    >
                      {copied === 'postprocess' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Early-Closure:</span>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={postProcess.earlyClosureDetected ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {postProcess.earlyClosureDetected ? 'Detectado' : 'Ninguno'}
                        </Badge>
                        {postProcess.strategy && (
                          <span className="text-xs text-muted-foreground">({postProcess.strategy})</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Q-Rate:</span>
                      <span className="font-mono">
                        {postProcess.questionCountBefore}→{postProcess.questionCountAfter}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Transcript Summary */}
            {transcript && transcript.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    Transcripción ({transcript.length} turnos)
                  </h4>
                  <ScrollArea className="max-h-24">
                    <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
                      {transcript.slice(-6).map((turn, index) => (
                        <div key={index} className="flex gap-2">
                          <Badge 
                            variant={turn.speaker === 'Nini' ? 'default' : 'secondary'} 
                            className="text-xs shrink-0"
                          >
                            {turn.speaker}
                          </Badge>
                          <span className="text-muted-foreground truncate">
                            {turn.text.slice(0, 40)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}