import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LintFinding } from "../types/core";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface LintBadgeProps {
  finding: LintFinding;
  className?: string;
}

export function LintBadge({ finding, className }: LintBadgeProps) {
  const HINTS: Record<string, string> = {
    CRISIS_MISSED: "Señales de crisis no gestionadas.",
    CRISIS_SUPPRESSION: "Se intentó usar CTA/estilo prohibido en crisis.",
    PHASE_UNKNOWN: "El turno no mapea a una fase conocida.",
    PHASE_ORDER: "Orden de fases no respetado.",
    PHASE_QUESTION_LEN: "Pregunta supera longitud máxima.",
    LENGTH_MAX: "Mensaje muy largo.",
    EMOJI_FORBIDDEN_SET: "Emoji fuera del set permitido.",
    EVIDENCE_MISSING: "Se citó evidencia sin respaldo.",
    DIAGNOSIS: "Se proporcionó diagnóstico médico/psicológico.",
    LEGAL_MEDICAL_ADVICE: "Se dio consejo médico/legal específico.",
    CTA_INELIGIBLE: "CTA usado en contexto no apropiado.",
    CTA_DURING_CRISIS: "CTA usado durante modo crisis."
  };

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
          <div className="text-xs opacity-90 mt-1">
            {HINTS[finding.code] ?? "Hallazgo de lint"}
          </div>
          {finding.details && (
            <div className="text-xs opacity-75 mt-1">{finding.details}</div>
          )}
          <div className="text-xs mt-1 opacity-75">
            Severidad: {severity} | Estado: {finding.pass ? 'Pasa' : 'Falla'}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}