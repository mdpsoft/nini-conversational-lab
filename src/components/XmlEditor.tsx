import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Download } from "lucide-react";
import { validateXmlSyntax } from "../core/nini/xml";

interface XmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function XmlEditor({ value, onChange, placeholder, className }: XmlEditorProps) {
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null);

  const handleValidate = () => {
    const result = validateXmlSyntax(value);
    setValidation(result);
  };

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'system-spec.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lineCount = value.split('\n').length;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">XML System Spec</span>
          <Badge variant="outline" className="text-xs">
            {lineCount} lines
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {validation && (
            <Badge
              variant={validation.valid ? "default" : "destructive"}
              className="text-xs"
            >
              {validation.valid ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Valid
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Invalid
                </>
              )}
            </Badge>
          )}
          
          <Button variant="outline" size="sm" onClick={handleValidate}>
            Validate XML
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[300px] font-mono text-sm"
      />
      
      {validation && !validation.valid && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
          <strong>Validation Error:</strong> {validation.error}
        </div>
      )}
    </div>
  );
}