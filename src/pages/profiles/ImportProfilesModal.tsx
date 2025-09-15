import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { UserAIProfile } from '@/store/profiles';
import { 
  validateProfileBundle, 
  detectConflicts, 
  resolveConflicts, 
  readFileAsText,
  ConflictResolution,
  ProfileBundle 
} from '@/utils/profileImportExport';

interface ImportProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfiles: UserAIProfile[];
  onImport: (profiles: UserAIProfile[]) => void;
}

export function ImportProfilesModal({ isOpen, onClose, existingProfiles, onImport }: ImportProfilesModalProps) {
  const [jsonContent, setJsonContent] = useState('');
  const [importedBundle, setImportedBundle] = useState<ProfileBundle | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'input' | 'conflicts' | 'preview'>('input');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      setJsonContent(content);
      parseAndValidate(content);
    } catch (error) {
      setError('Error reading file');
    }
  };

  const handleJsonPaste = (value: string) => {
    setJsonContent(value);
    if (value.trim()) {
      parseAndValidate(value);
    }
  };

  const parseAndValidate = (content: string) => {
    try {
      const data = JSON.parse(content);
      const validation = validateProfileBundle(data);
      
      if (!validation.valid) {
        setError(validation.error || 'Invalid bundle format');
        return;
      }

      const bundle = data as ProfileBundle;
      setImportedBundle(bundle);
      
      // Check for conflicts
      const conflictIds = detectConflicts(bundle.profiles, existingProfiles);
      setConflicts(conflictIds);
      
      if (conflictIds.length > 0) {
        // Initialize resolutions for conflicts
        setResolutions(conflictIds.map(id => ({
          profileId: id,
          action: 'duplicate' as const
        })));
        setStep('conflicts');
      } else {
        setStep('preview');
      }
      
      setError('');
    } catch (error) {
      setError('Invalid JSON format');
    }
  };

  const updateResolution = (profileId: string, action: ConflictResolution['action']) => {
    setResolutions(prev => 
      prev.map(r => 
        r.profileId === profileId 
          ? { ...r, action }
          : r
      )
    );
  };

  const handleImport = () => {
    if (!importedBundle) return;

    const resolvedProfiles = resolveConflicts(importedBundle.profiles, resolutions);
    onImport(resolvedProfiles);
    handleClose();
  };

  const handleClose = () => {
    setJsonContent('');
    setImportedBundle(null);
    setConflicts([]);
    setResolutions([]);
    setError('');
    setStep('input');
    onClose();
  };

  const getProfileById = (id: string) => {
    return importedBundle?.profiles.find(p => p.id === id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import USERAI Profiles</DialogTitle>
          <DialogDescription>
            Import profiles from a JSON bundle file or paste JSON content directly.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload File</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </Button>
                <span className="text-sm text-muted-foreground">or</span>
              </div>
            </div>

            {/* JSON Textarea */}
            <div className="space-y-2">
              <Label>Paste JSON Content</Label>
              <Textarea
                value={jsonContent}
                onChange={(e) => handleJsonPaste(e.target.value)}
                placeholder="Paste your USERAI profiles JSON bundle here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'conflicts' && importedBundle && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Some profiles have conflicting IDs with existing profiles. Choose how to resolve each conflict:
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {conflicts.map(profileId => {
                const profile = getProfileById(profileId);
                const existingProfile = existingProfiles.find(p => p.id === profileId);
                const resolution = resolutions.find(r => r.profileId === profileId);
                
                if (!profile || !existingProfile) return null;

                return (
                  <Card key={profileId}>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {profile.name}
                        <Badge variant="outline">{profile.id}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Existing</Label>
                          <p className="text-sm">{existingProfile.name} (v{existingProfile.version})</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Imported</Label>
                          <p className="text-sm">{profile.name} (v{profile.version})</p>
                        </div>
                      </div>
                      
                      <Select
                        value={resolution?.action}
                        onValueChange={(value: ConflictResolution['action']) => 
                          updateResolution(profileId, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep">Keep existing</SelectItem>
                          <SelectItem value="overwrite">Overwrite with imported</SelectItem>
                          <SelectItem value="duplicate">Duplicate as new</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {step === 'preview' && importedBundle && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                Ready to import {importedBundle.count} profile(s). Review the details below:
              </AlertDescription>
            </Alert>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {importedBundle.profiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{profile.name}</span>
                    <Badge variant="outline" className="ml-2">v{profile.version}</Badge>
                  </div>
                  <Badge variant="secondary">{profile.lang.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          {step === 'input' && (
            <Button disabled={!importedBundle}>
              Next
            </Button>
          )}
          
          {step === 'conflicts' && (
            <Button onClick={() => setStep('preview')}>
              Continue
            </Button>
          )}
          
          {step === 'preview' && (
            <Button onClick={handleImport}>
              Import Profiles
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}