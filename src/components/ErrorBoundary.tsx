import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Always log full error details to console for debugging
    console.error('[ErrorBoundary] Component error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Full stack:', error.stack);
    
    // Store errorInfo in state for potential display
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Check for debug flag (note: VITE_* env vars might not work in this environment)
      const isDebugMode = import.meta.env?.VITE_DEBUG_ERRORS === 'true' || 
                         typeof window !== 'undefined' && localStorage.getItem('debug-errors') === 'true';

      return this.props.fallback || (
        <div className="p-6 text-red-600 border border-red-200 rounded-lg bg-red-50 max-w-4xl">
          <h3 className="font-semibold mb-3 text-lg">Hubo un problema al cargar el editor</h3>
          
          {/* Error message */}
          <div className="mb-3">
            <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
            <p className="text-sm text-red-700 bg-red-100 p-2 rounded border">
              {this.state.error?.message || 'Error desconocido'}
            </p>
          </div>

          {/* First line of stack trace */}
          {this.state.error?.stack && (
            <div className="mb-3">
              <p className="text-sm font-medium text-red-800 mb-1">Ubicación:</p>
              <p className="text-xs text-red-600 bg-red-100 p-2 rounded border font-mono">
                {this.state.error.stack.split('\n')[1]?.trim() || 'Stack trace no disponible'}
              </p>
            </div>
          )}

          {/* Full stack trace in debug mode */}
          {isDebugMode && this.state.error?.stack && (
            <details className="mb-3">
              <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900">
                Stack trace completo (debug mode)
              </summary>
              <pre className="text-xs text-red-600 bg-red-100 p-3 rounded border mt-2 overflow-auto max-h-60 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </details>
          )}

          {/* Component stack in debug mode */}
          {isDebugMode && this.state.errorInfo?.componentStack && (
            <details className="mb-3">
              <summary className="text-sm font-medium text-red-800 cursor-pointer hover:text-red-900">
                Component stack (debug mode)
              </summary>
              <pre className="text-xs text-red-600 bg-red-100 p-3 rounded border mt-2 overflow-auto max-h-60 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {/* Debug instructions */}
          {!isDebugMode && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <strong>Para más detalles:</strong> Abre DevTools y revisa la consola, o activa debug mode:
                <code className="ml-1 px-1 bg-yellow-100 rounded">localStorage.setItem('debug-errors', 'true')</code>
              </p>
            </div>
          )}

          <button 
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}