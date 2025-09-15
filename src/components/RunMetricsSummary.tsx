import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { BarChart3, MessageCircle, Hash } from "lucide-react";
import { getTopItems } from "../core/metrics/turnMetrics";

interface RunMetricsSummaryProps {
  metrics: {
    avgChars: number;
    avgQuestions: number;
    emotionFreq: Record<string, number>;
    needFreq: Record<string, number>;
    boundaryFreq: Record<string, number>;
  };
}

export function RunMetricsSummary({ metrics }: RunMetricsSummaryProps) {
  const topEmotions = getTopItems(metrics.emotionFreq, 3);
  const topNeeds = getTopItems(metrics.needFreq, 3);
  const topBoundaries = getTopItems(metrics.boundaryFreq, 3);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        <span className="font-medium">Run Summary</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Hash className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Avg Chars:</span>
          <span className="font-medium">{metrics.avgChars}</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Avg Questions:</span>
          <span className="font-medium">{metrics.avgQuestions}</span>
        </div>
      </div>

      {topEmotions.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Top Emotions:</span>
          <div className="flex flex-wrap gap-1">
            {topEmotions.map(({ item, count }) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item} ({count})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {topNeeds.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Top Needs:</span>
          <div className="flex flex-wrap gap-1">
            {topNeeds.map(({ item, count }) => (
              <Badge key={item} variant="outline" className="text-xs">
                {item} ({count})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {topBoundaries.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Top Boundaries:</span>
          <div className="flex flex-wrap gap-1">
            {topBoundaries.map(({ item, count }) => (
              <Badge key={item} variant="destructive" className="text-xs">
                {item} ({count})
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}