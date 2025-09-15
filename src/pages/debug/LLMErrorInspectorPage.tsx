import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, AlertTriangle, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ErrorAnalysis {
  category: 'api' | 'network' | 'parsing' | 'rate_limit' | 'auth' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  suggestions: string[];
  retryable: boolean;
}

export default function LLMErrorInspectorPage() {
  const [errorInput, setErrorInput] = useState('');
  const [analysis, setAnalysis] = useState<ErrorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeError = async () => {
    if (!errorInput.trim()) return;

    setIsAnalyzing(true);
    try {
      // Simulate error analysis - in a real app, this might call an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const analysis = performErrorAnalysis(errorInput);
      setAnalysis(analysis);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Failed to analyze the error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performErrorAnalysis = (errorText: string): ErrorAnalysis => {
    const lowerError = errorText.toLowerCase();
    
    // Rate limiting
    if (lowerError.includes('rate limit') || lowerError.includes('429') || lowerError.includes('quota')) {
      return {
        category: 'rate_limit',
        severity: 'medium',
        summary: 'Rate limiting detected',
        suggestions: [
          'Implement exponential backoff with jitter',
          'Reduce request frequency',
          'Consider upgrading API plan',
          'Use request queuing mechanism'
        ],
        retryable: true
      };
    }

    // Authentication issues
    if (lowerError.includes('unauthorized') || lowerError.includes('401') || lowerError.includes('invalid api key')) {
      return {
        category: 'auth',
        severity: 'high',
        summary: 'Authentication failure',
        suggestions: [
          'Verify API key is correct and active',
          'Check if API key has required permissions',
          'Ensure API key is properly formatted',
          'Contact provider if key should be valid'
        ],
        retryable: false
      };
    }

    // Network/connectivity
    if (lowerError.includes('network') || lowerError.includes('timeout') || lowerError.includes('connection')) {
      return {
        category: 'network',
        severity: 'medium',
        summary: 'Network connectivity issue',
        suggestions: [
          'Check internet connectivity',
          'Verify API endpoint URL',
          'Implement request timeout handling',
          'Add network retry logic'
        ],
        retryable: true
      };
    }

    // Parsing/format issues
    if (lowerError.includes('json') || lowerError.includes('parse') || lowerError.includes('format')) {
      return {
        category: 'parsing',
        severity: 'medium',
        summary: 'Data parsing or format issue',
        suggestions: [
          'Validate request payload format',
          'Check response content type',
          'Verify JSON structure',
          'Handle malformed responses gracefully'
        ],
        retryable: false
      };
    }

    // API-specific errors
    if (lowerError.includes('400') || lowerError.includes('bad request') || lowerError.includes('invalid')) {
      return {
        category: 'api',
        severity: 'high',
        summary: 'API request error',
        suggestions: [
          'Validate all required parameters',
          'Check parameter types and formats',
          'Review API documentation',
          'Test with minimal valid payload'
        ],
        retryable: false
      };
    }

    // Default analysis
    return {
      category: 'unknown',
      severity: 'medium',
      summary: 'Unable to categorize error',
      suggestions: [
        'Review full error logs',
        'Check API documentation',
        'Test with simplified request',
        'Contact support if issue persists'
      ],
      retryable: true
    };
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Error analysis copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'rate_limit': return 'secondary';
      case 'auth': return 'destructive';
      case 'network': return 'outline';
      case 'parsing': return 'default';
      case 'api': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bug className="h-8 w-8" />
          LLM Error Inspector
        </h1>
        <p className="text-muted-foreground">
          Analyze and troubleshoot LLM API errors with detailed suggestions
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Error Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your error message, stack trace, or log output here..."
              value={errorInput}
              onChange={(e) => setErrorInput(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <Button 
              onClick={analyzeError}
              disabled={!errorInput.trim() || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                "Analyzing..."
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Analyze Error
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!analysis ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Paste an error and click "Analyze Error" to get started</p>
              </div>
            ) : (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getCategoryColor(analysis.category)}>
                        {analysis.category.toUpperCase()}
                      </Badge>
                      <Badge variant={getSeverityColor(analysis.severity)}>
                        {analysis.severity.toUpperCase()}
                      </Badge>
                      {analysis.retryable && (
                        <Badge variant="outline">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Retryable
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold">{analysis.summary}</h3>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This is an automated analysis. Review suggestions carefully and adapt to your specific context.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
                
                <TabsContent value="suggestions" className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Recommended Actions:</h3>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(
                        `Error Analysis:\nCategory: ${analysis.category}\nSeverity: ${analysis.severity}\nSummary: ${analysis.summary}\n\nSuggestions:\n${analysis.suggestions.map(s => `• ${s}`).join('\n')}`
                      )}
                      className="w-full mt-4"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Analysis
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Examples */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Test Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setErrorInput('Rate limit exceeded. Please try again later. Status: 429')}
            >
              Rate Limit Error
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setErrorInput('Unauthorized: Invalid API key provided. Status: 401')}
            >
              Auth Error
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setErrorInput('Network timeout after 30 seconds. Connection failed.')}
            >
              Network Error
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setErrorInput('JSON parse error: Unexpected token at position 45')}
            >
              Parsing Error
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}