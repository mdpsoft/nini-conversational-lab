import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  format?: 'number' | 'percentage' | 'score';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  status?: 'good' | 'warning' | 'critical';
  className?: string;
}

export function MetricsCard({ 
  title, 
  value, 
  subtitle, 
  format = 'number',
  trend,
  status,
  className 
}: MetricsCardProps) {
  const formatValue = (val: number): string => {
    switch (format) {
      case 'percentage':
        return `${Math.round(val * 100)}%`;
      case 'score':
        return `${Math.round(val)}/100`;
      default:
        return val.toFixed(1);
    }
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-foreground';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-3 h-3" />;
      case 'down': return <TrendingDown className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
            {formatValue(value)}
          </div>
          
          {trend && (
            <Badge 
              variant="outline" 
              className={`text-xs ${
                trend.direction === 'up' ? 'text-green-600' :
                trend.direction === 'down' ? 'text-red-600' :
                'text-muted-foreground'
              }`}
            >
              {getTrendIcon(trend.direction)}
              <span className="ml-1">{Math.abs(trend.value)}</span>
            </Badge>
          )}
        </div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}