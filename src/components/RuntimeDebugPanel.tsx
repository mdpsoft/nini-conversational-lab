import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Clock, Copy, Gauge, Layers, Shield, BarChart3 } from "lucide-react";

interface RuntimeDebugPanelProps {
  debug?: {
    beat?: { name: string; index: number; total: number };
    memory?: { facts: string[] };
    scenarioContext?: { relationshipLabel?: string }; // Added scenario context
    postProcess?: {
      earlyClosureDetected?: boolean;
      questionCountBefore?: number;
      questionCountAfter?: number;
      strategy?: 'cut' | 'append' | 'rewrite';
    };
    safety?: {
      matched: string[];
      escalated: boolean;
    };
    metrics?: {
      chars: number;
      paragraphs: number;
      questions: number;
      emotions: string[];
      needs: string[];
      boundaries: string[];
    };
  };
}

export function RuntimeDebugPanel({ debug }: RuntimeDebugPanelProps) {
  if (!debug || (!debug.beat && !debug.memory && !debug.scenarioContext && !debug.postProcess && !debug.safety && !debug.metrics)) {
    return null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="p-3 space-y-3 text-xs border-dashed">
      {debug?.beat && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Beat</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => copyToClipboard(`${debug.beat?.name} (${debug.beat?.index}/${debug.beat?.total})`)}
              className="h-5 px-1"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{debug.beat.name}</Badge>
            <span className="text-muted-foreground">({debug.beat.index}/{debug.beat.total})</span>
          </div>
        </div>
      )}

      {debug?.scenarioContext && debug.scenarioContext.relationshipLabel && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {debug.scenarioContext.relationshipLabel}
            </Badge>
          </div>
        </div>
      )}

      {debug?.memory && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="font-medium">Memory ({debug.memory.facts.length})</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => copyToClipboard(debug.memory?.facts.join('\n• ') || '')}
              className="h-5 px-1"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="text-muted-foreground">
            {debug.memory.facts.length > 0 ? (
              <ul className="space-y-1">
                {debug.memory.facts.slice(0, 3).map((fact, i) => (
                  <li key={i} className="flex gap-1">
                    <span>•</span>
                    <span className="truncate">{fact}</span>
                  </li>
                ))}
                {debug.memory.facts.length > 3 && (
                  <li className="text-muted-foreground/70">+{debug.memory.facts.length - 3} more</li>
                )}
              </ul>
            ) : (
              <span>No facts</span>
            )}
          </div>
        </div>
      )}

      {debug?.postProcess && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            <span className="font-medium">Post-Processing</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Early Closure:</span>
              <Badge variant={debug.postProcess.earlyClosureDetected ? "destructive" : "secondary"}>
                {debug.postProcess.earlyClosureDetected ? "Detected" : "None"}
              </Badge>
              {debug.postProcess.strategy && (
                <Badge variant="outline">{debug.postProcess.strategy}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Questions:</span>
              <span>{debug.postProcess.questionCountBefore} → {debug.postProcess.questionCountAfter}</span>
            </div>
          </div>
        </div>
      )}

      {debug?.safety && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Safety</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Escalated:</span>
              <Badge variant={debug.safety.escalated ? "destructive" : "secondary"}>
                {debug.safety.escalated ? "Yes" : "No"}
              </Badge>
            </div>
            {debug.safety.matched.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Matched:</span>
                {debug.safety.matched.map((phrase, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">
                    {phrase}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {debug?.metrics && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="font-medium">Metrics</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">Chars: {debug.metrics.chars}</span>
              <span className="text-muted-foreground">Paragraphs: {debug.metrics.paragraphs}</span>
              <span className="text-muted-foreground">Questions: {debug.metrics.questions}</span>
            </div>
            {debug.metrics.emotions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Emotions:</span>
                {debug.metrics.emotions.slice(0, 3).map((emotion, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {emotion}
                  </Badge>
                ))}
              </div>
            )}
            {debug.metrics.needs.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Needs:</span>
                {debug.metrics.needs.slice(0, 3).map((need, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {need}
                  </Badge>
                ))}
              </div>
            )}
            {debug.metrics.boundaries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Boundaries:</span>
                {debug.metrics.boundaries.slice(0, 3).map((boundary, i) => (
                  <Badge key={i} variant="destructive" className="text-xs">
                    {boundary}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}