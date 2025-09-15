import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { UserAIProfile } from "@/store/profiles";

interface JsonTabProps {
  data: UserAIProfile;
}

export function JsonTab({ data }: JsonTabProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Representación JSON</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copiar
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        <pre className="bg-muted p-4 rounded-lg text-sm font-mono max-h-[600px] overflow-auto border">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <p className="text-sm text-muted-foreground">
        Este JSON se actualiza automáticamente conforme modificas los campos en las otras pestañas.
        Puedes usar esta representación para importar/exportar perfiles o para integración con APIs.
      </p>
    </div>
  );
}