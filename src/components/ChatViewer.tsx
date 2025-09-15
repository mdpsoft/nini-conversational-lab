import { Turn, LintFinding } from "../types/core";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Bot, AlertTriangle, Languages } from "lucide-react";
import { countEmojis } from "../utils/emoji";
import { RuntimeDebugPanel } from "./RuntimeDebugPanel";

interface ChatViewerProps {
  turns: Turn[];
  lints?: Array<{ turnIndex: number; findings?: LintFinding[] }>;
  targetLanguage?: string;
  className?: string;
  showRuntimeDebug?: boolean;
}

export function ChatViewer({ turns, lints, targetLanguage = 'ES', className, showRuntimeDebug = false }: ChatViewerProps) {
  const getLanguageMixFindings = (turnIndex: number) => {
    if (!lints) return [];
    
    const turnLints = lints.find(lint => lint.turnIndex === turnIndex);
    return turnLints?.findings?.filter(finding => 
      finding.code === 'LANGUAGE_MIX' && !finding.pass
    ) || [];
  };
  if (turns.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 text-muted-foreground ${className}`}>
        No conversation turns yet
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Language Mix Alert */}
      {lints?.some(lint => 
        lint.findings?.some(f => f.code === 'LANGUAGE_MIX' && !f.pass)
      ) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Language mixing detected. Nini switched languages during the conversation.
          </AlertDescription>
        </Alert>
      )}
      
      {turns.map((turn, index) => {
        const languageMixFindings = getLanguageMixFindings(index);
        
        return (
        <div
          key={index}
          className={`flex gap-3 ${
            turn.agent === 'nini' ? 'flex-row' : 'flex-row-reverse'
          }`}
        >
          <div className="flex-shrink-0">
            {turn.agent === 'nini' ? (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className={`flex-1 max-w-[80%] ${turn.agent === 'user' ? 'text-right' : ''}`}>
            <div
              className={`p-3 rounded-lg ${
                turn.agent === 'nini'
                  ? 'bg-muted text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap">{turn.text}</p>
            </div>
            
            {/* Turn metadata */}
            <div className={`mt-1 flex gap-2 ${turn.agent === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Badge variant="outline" className="text-xs">
                Turn {index + 1}
              </Badge>
              
              {/* Language badge */}
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Languages className="w-3 h-3" />
                {targetLanguage}
              </Badge>
              
              {turn.agent === 'nini' && (
                <>
                  <Badge variant="outline" className="text-xs">
                    {turn.text.length} chars
                  </Badge>
                  
                  {countEmojis(turn.text) > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {countEmojis(turn.text)} emojis
                    </Badge>
                  )}
                  
                  {turn.meta?.phase && (
                    <Badge variant="secondary" className="text-xs">
                      {turn.meta.phase}
                    </Badge>
                  )}
                  
                  {turn.meta?.crisis_active && (
                    <Badge variant="destructive" className="text-xs">
                      Crisis
                    </Badge>
                  )}
                  
                  {/* Language mix warning */}
                  {languageMixFindings.length > 0 && (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Lang Mix
                    </Badge>
                  )}
                </>
              )}
            </div>
            
            {/* Runtime Debug Panel for turns with debug data */}
            {showRuntimeDebug && (turn.meta?.beat || turn.meta?.memory || turn.meta?.postProcess || turn.meta?.safety || turn.meta?.metrics) && (
              <div className="mt-2">
                <RuntimeDebugPanel 
                  debug={{
                    beat: turn.meta?.beat,
                    memory: turn.meta?.memory,
                    postProcess: turn.meta?.postProcess,
                    safety: turn.meta?.safety,
                    metrics: turn.meta?.metrics,
                  }}
                />
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}