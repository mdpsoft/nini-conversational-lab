import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LintFinding } from "../types/core";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { LINT_EXPLANATIONS } from "@/constants/lintExplanations";

interface LintBadgeProps {
  finding: LintFinding;
  className?: string;
}

export function LintBadge({ finding, className }: LintBadgeProps) {

  const getSeverity = (code: string): 'low' | 'medium' | 'high' => {
    return LINT_EXPLANATIONS[code]?.severity || 'low';
  };

  const getVariant = (severity: string, pass: boolean) => {
    if (pass) return 'default';
    
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getIcon = (pass: boolean, severity: string) => {
    if (pass) return <CheckCircle className="w-3 h-3" />;
    
    switch (severity) {
      case 'high': return <XCircle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const severity = getSeverity(finding.code);
  const variant = getVariant(severity, finding.pass);
  const icon = getIcon(finding.pass, severity);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant as any} className={`text-xs cursor-help ${className}`}>
          {icon}
          <span className="ml-1">{finding.code}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-sm">
          <div className="font-medium">{LINT_EXPLANATIONS[finding.code]?.title || finding.code}</div>
          <div className="text-xs opacity-90 mt-1">
            {LINT_EXPLANATIONS[finding.code]?.why || "Hallazgo de lint"}
          </div>
          {LINT_EXPLANATIONS[finding.code]?.howToFix && (
            <div className="text-xs opacity-80 mt-2">
              <strong>Cómo arreglar:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {LINT_EXPLANATIONS[finding.code].howToFix.map((fix, i) => (
                  <li key={i}>{fix}</li>
                ))}
              </ul>
            </div>
          )}
          {finding.details && (
            <div className="text-xs opacity-75 mt-2 italic">{finding.details}</div>
          )}
          <div className="text-xs mt-2 opacity-75 border-t pt-1">
            Severidad: {severity} | Estado: {finding.pass ? 'Pasa' : 'Falla'}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}