import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SchemaErrorBannerProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function SchemaErrorBanner({ onRetry, isRetrying = false }: SchemaErrorBannerProps) {
  const navigate = useNavigate();

  const handleOpenSupabaseSQL = () => {
    navigate('/supabase-sql');
    // Auto-scroll to profiles section after navigation
    setTimeout(() => {
      const profilesSection = document.querySelector('[data-section="profiles-schema"]');
      profilesSection?.scrollIntoView({ behavior: 'smooth' });
    }, 500);
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>USERAI Profiles table missing</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>The Supabase table 'userai_profiles' (v2.1) is not available. Falling back to local storage.</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenSupabaseSQL}
            className="bg-background hover:bg-accent"
          >
            <Database className="h-4 w-4 mr-1" />
            Create Profiles Table
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="bg-background hover:bg-accent"
          >
            {isRetrying ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}