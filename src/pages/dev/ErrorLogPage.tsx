import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronDown, ChevronRight, AlertTriangle, Bug } from 'lucide-react';
import { useErrorLogStore } from '@/store/errorLog';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ErrorLogPage() {
  const { errors, clearErrors } = useErrorLogStore();
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const toggleExpanded = (errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      absolute: format(date, 'dd/MM/yyyy HH:mm:ss', { locale: es }),
      relative: formatDistanceToNow(date, { addSuffix: true, locale: es })
    };
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-8 w-8 text-red-500" />
            Error Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro de errores capturados por ErrorBoundary
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {errors.length} error{errors.length !== 1 ? 'es' : ''}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/dev/supabase-check'}
          >
            🔍 Supabase Health
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/dev/realtime-check'}
          >
            📡 Realtime Check
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/dev/express-check'}
          >
            ⚡ Express Check
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/dev/blank-test'}
          >
            🔍 Blank Test
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={clearErrors}
            disabled={errors.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Log
          </Button>
        </div>
      </div>

      {errors.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No hay errores registrados</CardTitle>
            <CardDescription>
              Los errores capturados por ErrorBoundary aparecerán aquí
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {errors.map((error) => {
            const isExpanded = expandedErrors.has(error.id);
            const timestamps = formatTimestamp(error.timestamp);
            
            return (
              <Card key={error.id} className="border-l-4 border-l-red-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          {error.componentName || 'Component desconocido'}
                        </CardTitle>
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      </div>
                      
                      <CardDescription className="text-sm">
                        <div className="flex items-center gap-4">
                          <span title={timestamps.absolute}>
                            {timestamps.relative}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {timestamps.absolute}
                          </span>
                        </div>
                      </CardDescription>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(error.id)}
                      className="ml-2"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Error message */}
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800 font-medium">
                      {error.message}
                    </p>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {/* Stack trace */}
                    {error.stack && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                          Stack Trace:
                        </h4>
                        <pre className="text-xs bg-gray-100 p-3 rounded border overflow-auto max-h-60 whitespace-pre-wrap">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {/* Component stack */}
                    {error.errorInfo && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                          Component Stack:
                        </h4>
                        <pre className="text-xs bg-blue-50 p-3 rounded border overflow-auto max-h-60 whitespace-pre-wrap">
                          {error.errorInfo}
                        </pre>
                      </div>
                    )}

                    {!error.stack && !error.errorInfo && (
                      <p className="text-sm text-muted-foreground italic">
                        No hay información adicional de stack trace disponible
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}