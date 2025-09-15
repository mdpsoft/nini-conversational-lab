import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserAIProfile } from '@/store/profiles';
import { SupabaseProfilesRepo } from '@/data/useraiProfiles';
import { useToast } from '@/hooks/use-toast';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  localProfiles: UserAIProfile[];
  onMigrationComplete: () => void;
}

export function MigrationModal({ 
  isOpen, 
  onClose, 
  localProfiles, 
  onMigrationComplete 
}: MigrationModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const { toast } = useToast();

  const handleMigrate = async () => {
    if (localProfiles.length === 0) return;

    setIsUploading(true);
    try {
      const repo = new SupabaseProfilesRepo();
      await repo.bulkUpsert(localProfiles);
      
      setMigrationComplete(true);
      toast({
        title: "Migration successful",
        description: `${localProfiles.length} profile(s) uploaded to Supabase`,
      });
      
      onMigrationComplete();
    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearLocal = () => {
    if (confirm('Clear all local profiles? This cannot be undone.')) {
      localStorage.removeItem('userai_profiles');
      toast({
        title: "Local profiles cleared",
        description: "All local profile data has been removed",
      });
      onClose();
      onMigrationComplete();
    }
  };

  const handleClose = () => {
    setMigrationComplete(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Migrate Profiles to Supabase
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!migrationComplete ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will upload {localProfiles.length} profile(s) from local storage to your Supabase account.
                  Existing profiles with the same ID will be updated.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profiles to migrate ({localProfiles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {localProfiles.map((profile) => (
                      <div 
                        key={profile.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{profile.name}</span>
                            <Badge variant="outline">v{profile.version}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {profile.description}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {profile.id}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMigrate}
                  disabled={isUploading || localProfiles.length === 0}
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Migrate to Supabase
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully uploaded {localProfiles.length} profile(s) to Supabase.
                  Your profiles are now synced to the cloud!
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">Migration Complete</h3>
                      <p className="text-sm text-muted-foreground">
                        Your profiles are now available in Supabase
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Optional:</strong> You can now clear the local copy of your profiles 
                  since they're safely stored in Supabase.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={handleClearLocal}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Local Copy
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}