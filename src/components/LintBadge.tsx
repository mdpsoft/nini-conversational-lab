import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LintFinding } from "../types/core";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface LintBadgeProps {
  finding: LintFinding;
  className?: string;
}

export function LintBadge({ finding, className }: LintBadgeProps) {
  const getSeverity = (code: string): 'low' | 'medium' | 'high' => {
    const highSeverityCodes = [
      'CRISIS_MISSED', 'CRISIS_FALSE_POSITIVE', 'CRISIS_SUPPRESSION',
      'DIAGNOSIS', 'LEGAL_MEDICAL_ADVICE'
    ];
    const mediumSeverityCodes = [
      'PHASE_ORDER', 'PHASE_UNKNOWN', 'CTA_INELIGIBLE', 'CTA_DURING_CRISIS',
      'EVIDENCE_MISSING'
    ];
    
    if (highSeverityCodes.includes(code)) return 'high';
    if (mediumSeverityCodes.includes(code)) return 'medium';
    return 'low';
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
        <div className="max-w-xs">
          <div className="font-medium">{finding.code}</div>
          {finding.details && (
            <div className="text-xs opacity-90">{finding.details}</div>
          )}
          <div className="text-xs mt-1 opacity-75">
            Severity: {severity} | Status: {finding.pass ? 'Pass' : 'Fail'}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}