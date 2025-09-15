import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useSettingsStore } from "../../store/settings";
import { XmlEditor } from "../../components/XmlEditor";
import { DEFAULT_KNOBS } from "../../types/core";
import { createMinimalXml, validateXmlSyntax, extractKnobsFromXml, convertLegacyKnobsToStandard, insertKnobsIntoXml } from "../../core/nini/xml";
import NiniAdapter from "../../core/nini/NiniAdapter";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const {
    apiKey, setApiKey,
    rememberKey, setRememberKey,
    model, setModel,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    xmlSystemSpec, setXmlSystemSpec,
    knobsBase, setKnobsBase,
    saveEncryptedKey,
  } = useSettingsStore();

  const { toast } = useToast();
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    latency?: number;
    error?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key first",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const result = await NiniAdapter.testConnection(apiKey, model);
      setConnectionStatus(result);
      
      if (result.success) {
        toast({
          title: "Connection successful",
          description: `Connected in ${result.latency}ms`,
        });
      } else {
        toast({
          title: "Connection failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setConnectionStatus({ success: false, error: errorMessage });
      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (rememberKey && apiKey) {
      await saveEncryptedKey();
    }
    
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully",
    });
  };

  const handleRestoreDefaults = () => {
    setXmlSystemSpec(createMinimalXml());
    setKnobsBase(DEFAULT_KNOBS);
    
    toast({
      title: "Defaults restored",
      description: "XML and knobs have been reset to defaults",
    });
  };

  const handleValidateXml = () => {
    const validation = validateXmlSyntax(xmlSystemSpec);
    
    if (validation.valid) {
      // Auto-load knobs from XML when validation succeeds
      const extractedKnobs = extractKnobsFromXml(xmlSystemSpec);
      const cleanKnobs = Object.fromEntries(
        Object.entries(extractedKnobs).filter(([_, value]) => value !== undefined)
      );
      
      if (Object.keys(cleanKnobs).length > 0) {
        setKnobsBase(cleanKnobs);
      }
      
      toast({
        title: "XML validated successfully",
        description: Object.keys(cleanKnobs).length > 0 
          ? `Valid XML. Loaded ${Object.keys(cleanKnobs).length} knobs from XML.`
          : "Valid XML structure.",
      });
    } else {
      toast({
        title: "XML validation failed",
        description: validation.error,
        variant: "destructive",
      });
    }
  };

  const handleLoadKnobsFromXml = () => {
    const extractedKnobs = extractKnobsFromXml(xmlSystemSpec);
    const cleanKnobs = Object.fromEntries(
      Object.entries(extractedKnobs).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanKnobs).length > 0) {
      setKnobsBase(cleanKnobs);
      toast({
        title: "Knobs loaded",
        description: `Loaded ${Object.keys(cleanKnobs).length} knobs from XML. Sliders have been updated.`,
      });
    } else {
      toast({
        title: "No knobs found",
        description: "No <Knobs> element found in the XML or no valid knob values detected.",
        variant: "destructive",
      });
    }
  };

  const handleApplyFromXml = () => {
    const extractedKnobs = extractKnobsFromXml(xmlSystemSpec);
    const cleanKnobs = Object.fromEntries(
      Object.entries(extractedKnobs).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(cleanKnobs).length > 0) {
      setKnobsBase({ ...knobsBase, ...cleanKnobs });
      toast({
        title: "Knobs applied from XML",
        description: `Applied ${Object.keys(cleanKnobs).length} knobs from XML to current configuration.`,
      });
    } else {
      toast({
        title: "No knobs found",
        description: "No valid knobs found in XML to apply.",
        variant: "destructive",
      });
    }
  };

  const handleWriteKnobsToXml = () => {
    try {
      const updatedXml = insertKnobsIntoXml(xmlSystemSpec, knobsBase);
      setXmlSystemSpec(updatedXml);
      
      toast({
        title: "Knobs written to XML",
        description: "Current knobs configuration has been written to the XML specification.",
      });
    } catch (error) {
      toast({
        title: "Error writing knobs",
        description: error instanceof Error ? error.message : "Failed to write knobs to XML",
        variant: "destructive",
      });
    }
  };

  const handleConvertXmlKnobs = () => {
    try {
      const normalized = convertLegacyKnobsToStandard(xmlSystemSpec);
      setXmlSystemSpec(normalized);

      // Auto-sync sliders after conversion
      const extractedKnobs = extractKnobsFromXml(normalized);
      const cleanKnobs = Object.fromEntries(
        Object.entries(extractedKnobs).filter(([_, value]) => value !== undefined)
      );
      if (Object.keys(cleanKnobs).length > 0) {
        setKnobsBase(cleanKnobs);
      }

      toast({
        title: "XML updated",
        description: "Knobs converted to standard format and sliders synchronized.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({
        title: "Conversion failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your OpenAI connection and Nini parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - OpenAI Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                OpenAI Configuration
                {connectionStatus && (
                  <Badge variant={connectionStatus.success ? "default" : "destructive"}>
                    {connectionStatus.success ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {connectionStatus.success ? 'Connected' : 'Failed'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apikey">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="apikey"
                      type={showApiKey ? "text" : "password"}
                      value={apiKey || ""}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="remember"
                  checked={rememberKey}
                  onCheckedChange={setRememberKey}
                />
                <Label htmlFor="remember" className="text-sm">
                  Remember API Key (encrypted locally)
                </Label>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Your API key is stored only in your browser and optionally encrypted locally. 
                It's never sent to any server except OpenAI.
              </p>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5-2025-08-07">GPT-5 (Recommended)</SelectItem>
                    <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                    <SelectItem value="gpt-5-mini-2025-08-07">GPT-5 Mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Temperature: {temperature}</Label>
                  <Slider
                    value={[temperature]}
                    onValueChange={([value]) => setTemperature(value)}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Tokens: {maxTokens}</Label>
                  <Slider
                    value={[maxTokens]}
                    onValueChange={([value]) => setMaxTokens(value)}
                    min={256}
                    max={2048}
                    step={64}
                  />
                </div>
              </div>

              <Button 
                onClick={handleTestConnection} 
                disabled={!apiKey || testingConnection}
                className="w-full"
              >
                {testingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - XML and Knobs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Specification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <XmlEditor
                value={xmlSystemSpec}
                onChange={setXmlSystemSpec}
                placeholder="Enter your XML system specification..."
              />
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleValidateXml}
                    className="flex-1"
                  >
                    Validate XML
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleLoadKnobsFromXml}
                    className="flex-1"
                  >
                    Load knobs from XML
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleConvertXmlKnobs}
                    className="flex-1"
                  >
                    Convert XML Knobs
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleApplyFromXml}
                    className="flex-1"
                  >
                    Apply from XML
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleWriteKnobsToXml}
                    className="flex-1"
                  >
                    Write Knobs to XML
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language & Lexicon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Language policy</Label>
                <span className="text-sm">App UI locale</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Lexicon policy</Label>
                <span className="text-sm">English-only display</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Mix-language prevention</Label>
                <Badge variant="secondary">Enabled</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base Knobs Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(DEFAULT_KNOBS).map(([key, defaultValue]) => {
                const currentValue = knobsBase[key as keyof typeof knobsBase];
                
                if (typeof defaultValue === 'boolean') {
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key} className="text-sm capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <Switch
                        id={key}
                        checked={currentValue as boolean}
                        onCheckedChange={(checked) => 
                          setKnobsBase({ [key]: checked })
                        }
                      />
                    </div>
                  );
                }
                
                if (key === 'prefer_locale') {
                  return (
                    <div key={key} className="space-y-2">
                      <Label className="text-sm capitalize">
                        Preferred Language
                      </Label>
                      <Select 
                        value={currentValue as string} 
                        onValueChange={(value: 'es' | 'en' | 'auto') => setKnobsBase({ [key]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-detect</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                
                if (typeof defaultValue === 'number') {
                  const isInteger = key.includes('turns') || key.includes('chars');
                  const max = isInteger ? (key.includes('chars') ? 2000 : 20) : 1;
                  const step = isInteger ? 1 : 0.1;
                  
                  return (
                    <div key={key} className="space-y-2">
                      <Label className="text-sm capitalize">
                        {key.replace(/_/g, ' ')}: {currentValue}
                        {key === 'language_strictness' && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Controls language mixing tolerance)
                          </span>
                        )}
                      </Label>
                      <Slider
                        value={[currentValue as number]}
                        onValueChange={([value]) => 
                          setKnobsBase({ [key]: value })
                        }
                        min={0}
                        max={max}
                        step={step}
                      />
                    </div>
                  );
                }
                
                return null;
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          Save Settings
        </Button>
        <Button variant="outline" onClick={handleRestoreDefaults}>
          Restore Defaults
        </Button>
      </div>
    </div>
  );
}