import { Turn } from "../types/core";
import { Badge } from "@/components/ui/badge";
import { User, Bot } from "lucide-react";
import { countEmojis } from "../utils/emoji";

interface ChatViewerProps {
  turns: Turn[];
  className?: string;
}

export function ChatViewer({ turns, className }: ChatViewerProps) {
  if (turns.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 text-muted-foreground ${className}`}>
        No conversation turns yet
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {turns.map((turn, index) => (
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
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}