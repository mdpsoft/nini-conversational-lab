import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy, Play } from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { useToast } from "@/hooks/use-toast";

interface LLMTestResult {
  summary: {
    status: string;
    code?: number;
    message: string;
    durationMs: number;
    model: string;
    promptChars: number;
    inputTokensEstimate: number;
    simulated: boolean;
  };
  request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature: number;
    top_p: number;
    max_completion_tokens?: number;
  };
  response?: {
    success: boolean;
    data?: any;
    error?: {
      status?: number;
      headers?: any;
      body?: any;
      message?: string;
      stack?: string;
    };
  };
}

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
];

const DEFAULT_MESSAGE = "Siento que necesito pasos claros para manejar la situación con mi pareja…";

export default function LLMLogsPage() {
  const { apiKey } = useSettingsStore();
  const { toast } = useToast();
  
  const [userMessage, setUserMessage] = useState(DEFAULT_MESSAGE);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [simulationMode, setSimulationMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null);

  const handleRunTest = async () => {
    if (!apiKey && !simulationMode) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in Settings or enable Simulation Mode.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();

    try {
      const messages = [{ role: "user", content: userMessage }];
      const promptChars = userMessage.length;
      const inputTokensEstimate = Math.ceil(promptChars / 3.7);

      const request = {
        model: selectedModel,
        messages,
        temperature: 0.7,
        top_p: 1,
        max_completion_tokens: 800,
      };

      let result: LLMTestResult;

      if (simulationMode) {
        // Simulation mode
        const durationMs = Date.now() - startTime + Math.random() * 500; // Simulate some delay
        
        result = {
          summary: {
            status: "SIMULATED",
            code: 0,
            message: "Simulation completed successfully",
            durationMs: Math.round(durationMs),
            model: selectedModel,
            promptChars,
            inputTokensEstimate,
            simulated: true,
          },
          request,
          response: {
            success: true,
            data: {
              id: "sim-" + Date.now(),
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: selectedModel,
              choices: [{
                index: 0,
                message: {
                  role: "assistant",
                  content: "Entiendo que estás pasando por una situación desafiante con tu pareja. Es completamente normal sentirse abrumado cuando necesitamos claridad en nuestras relaciones.\n\n¿Podrías contarme un poco más sobre qué aspecto específico de la situación te resulta más difícil de manejar? Esto me ayudará a darte pasos más precisos."
                },
                logprobs: null,
                finish_reason: "stop"
              }],
              usage: {
                prompt_tokens: inputTokensEstimate,
                completion_tokens: 85,
                total_tokens: inputTokensEstimate + 85
              }
            }
          }
        };
      } else {
        // Real API call
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          const durationMs = Date.now() - startTime;
          
          if (response.ok) {
            const data = await response.json();
            result = {
              summary: {
                status: "SUCCESS",
                code: response.status,
                message: "Request completed successfully",
                durationMs,
                model: selectedModel,
                promptChars,
                inputTokensEstimate,
                simulated: false,
              },
              request,
              response: {
                success: true,
                data,
              }
            };
          } else {
            const errorData = await response.json().catch(() => ({}));
            result = {
              summary: {
                status: "PROVIDER_ERROR",
                code: response.status,
                message: `HTTP ${response.status}: ${errorData.error?.message || response.statusText}`,
                durationMs,
                model: selectedModel,
                promptChars,
                inputTokensEstimate,
                simulated: false,
              },
              request,
              response: {
                success: false,
                error: {
                  status: response.status,
                  headers: Object.fromEntries([...response.headers.entries()]),
                  body: errorData,
                  message: errorData.error?.message || response.statusText,
                }
              }
            };
          }
        } catch (error) {
          const durationMs = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          result = {
            summary: {
              status: "NETWORK_ERROR",
              message: errorMessage,
              durationMs,
              model: selectedModel,
              promptChars,
              inputTokensEstimate,
              simulated: false,
            },
            request,
            response: {
              success: false,
              error: {
                message: errorMessage,
                stack: errorStack,
              }
            }
          };
        }
      }

      setTestResult(result);
      
    } catch (error) {
      console.error('Test execution error:', error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatJSON = (obj: any) => JSON.stringify(obj, null, 2);

  const getStatusBadge = () => {
    if (!testResult) return null;
    
    const { status, code, simulated } = testResult.summary;
    
    if (simulated) {
      return <Badge variant="secondary">Simulated</Badge>;
    }
    
    if (status === "SUCCESS") {
      return <Badge variant="default" className="bg-green-500">Success</Badge>;
    }
    
    if (status === "PROVIDER_ERROR" && code) {
      return <Badge variant="destructive">Provider Error {code}</Badge>;
    }
    
    return <Badge variant="destructive">Error</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">LLM Logs</h1>
        <p className="text-muted-foreground mt-2">Debug OpenAI API calls with detailed diagnostics</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">User Message</Label>
              <Textarea
                id="message"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="simulation">Simulation Mode</Label>
              <Switch
                id="simulation"
                checked={simulationMode}
                onCheckedChange={setSimulationMode}
              />
            </div>

            <Button 
              onClick={handleRunTest} 
              disabled={isRunning || !userMessage.trim()}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? "Running Test..." : "Run Test"}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Diagnostics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Diagnostics</CardTitle>
            {getStatusBadge()}
          </CardHeader>
          <CardContent>
            {!testResult ? (
              <div className="text-center py-8 text-muted-foreground">
                Run a test to see diagnostics
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {/* Summary */}
                <AccordionItem value="summary">
                  <AccordionTrigger className="flex items-center justify-between">
                    <span>Summary</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(formatJSON(testResult.summary), "Summary");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[280px] overflow-auto border rounded p-3 bg-muted/50">
                      <div className="space-y-2 text-sm font-mono">
                        <div><span className="font-semibold">Status:</span> {testResult.summary.status}</div>
                        {testResult.summary.code && (
                          <div><span className="font-semibold">Code:</span> {testResult.summary.code}</div>
                        )}
                        <div><span className="font-semibold">Message:</span> {testResult.summary.message}</div>
                        <div><span className="font-semibold">Duration:</span> {testResult.summary.durationMs}ms</div>
                        <div><span className="font-semibold">Model:</span> {testResult.summary.model}</div>
                        <div><span className="font-semibold">Prompt Chars:</span> {testResult.summary.promptChars}</div>
                        <div><span className="font-semibold">Input Tokens Est:</span> {testResult.summary.inputTokensEstimate}</div>
                        <div><span className="font-semibold">Simulated:</span> {testResult.summary.simulated ? "Yes" : "No"}</div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Request Preview */}
                <AccordionItem value="request">
                  <AccordionTrigger className="flex items-center justify-between">
                    <span>Request Preview</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(formatJSON(testResult.request), "Request");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[280px] overflow-auto border rounded p-3 bg-muted/50">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {formatJSON(testResult.request)}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Response / Raw Error */}
                <AccordionItem value="response">
                  <AccordionTrigger className="flex items-center justify-between">
                    <span>Response / Raw Error</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(formatJSON(testResult.response), "Response");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="max-h-[280px] overflow-auto border rounded p-3 bg-muted/50">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {formatJSON(testResult.response)}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}