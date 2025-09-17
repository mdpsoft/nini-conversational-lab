import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, AlertCircle } from 'lucide-react';
import { runRealtimeDualSmoke } from '@/utils/realtimeDualSmoke';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface RealtimeHeaderBadgeProps {
  onStatusChange?: (status: 'ok' | 'fail', path?: string) => void;
}

export function RealtimeHeaderBadge({ onStatusChange }: RealtimeHeaderBadgeProps) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [path, setPath] = useState<string>('unknown');
  const { isAuthenticated } = useSupabaseAuth();

  const checkRealtimeStatus = async () => {
    if (!isAuthenticated) {
      setStatus('fail');
      setPath('unauthenticated');
      onStatusChange?.('fail', 'unauthenticated');
      return;
    }

    try {
      setStatus('checking');
      const result = await runRealtimeDualSmoke(supabase);
      
      if (result.ok) {
        setStatus('ok');
        setPath(result.path);
        onStatusChange?.('ok', result.path);
      } else {
        setStatus('fail');
        setPath(result.path);
        onStatusChange?.('fail', result.path);
      }
    } catch (error) {
      setStatus('fail');
      setPath('error');
      onStatusChange?.('fail', 'error');
    }
  };

  useEffect(() => {
    // Run check on mount and when auth status changes
    checkRealtimeStatus();
  }, [isAuthenticated]);

  const getBadgeVariant = () => {
    switch (status) {
      case 'ok':
        return 'default';
      case 'fail':
        return 'destructive';
      case 'checking':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBadgeText = () => {
    switch (status) {
      case 'ok':
        return `Realtime OK · ${path}`;
      case 'fail':
        return 'Realtime FAIL · see debug';
      case 'checking':
        return 'Checking realtime...';
      default:
        return 'Realtime status unknown';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'ok':
        return <Wifi className="h-3 w-3" />;
      case 'fail':
        return <AlertCircle className="h-3 w-3" />;
      case 'checking':
        return <Wifi className="h-3 w-3 animate-pulse" />;
      default:
        return <Wifi className="h-3 w-3" />;
    }
  };

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="h-8 px-2"
    >
      <a href="/dev/realtime-debug" className="flex items-center gap-1">
        <Badge variant={getBadgeVariant()} className="flex items-center gap-1 text-xs">
          {getIcon()}
          {getBadgeText()}
        </Badge>
      </a>
    </Button>
  );
}