import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeBadgeProps {
  className?: string;
}

export function RealtimeBadge({ className }: RealtimeBadgeProps) {
  const [status, setStatus] = useState<'checking' | 'on' | 'off'>('checking');

  useEffect(() => {
    const checkRealtimeStatus = async () => {
      try {
        // Check for circuit breaker or SafeBoot first
        const isRealtimeDisabled = localStorage.getItem('realtimeDisabled') === 'true';
        const isSafeBoot = localStorage.getItem('safe-boot') === 'true';
        
        if (isRealtimeDisabled || isSafeBoot) {
          setStatus('off');
          return;
        }

        // Create a test channel to check connectivity
        const testChannel = supabase.channel('realtime-ping-test');
        
        const statusPromise = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000);
          
          testChannel.subscribe((status) => {
            clearTimeout(timeout);
            resolve(status === 'SUBSCRIBED');
          });
        });

        const isConnected = await statusPromise;
        supabase.removeChannel(testChannel);
        
        setStatus(isConnected ? 'on' : 'off');
      } catch (error) {
        console.error('Realtime status check failed:', error);
        setStatus('off');
      }
    };

    checkRealtimeStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkRealtimeStatus, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking...';
      case 'on':
        return 'On';
      case 'off':
        return 'Off';
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'checking':
        return 'secondary' as const;
      case 'on':
        return 'default' as const;
      case 'off':
        return 'destructive' as const;
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'checking':
        return <Wifi className="h-3 w-3 animate-pulse" />;
      case 'on':
        return <Wifi className="h-3 w-3" />;
      case 'off':
        return <WifiOff className="h-3 w-3" />;
    }
  };

  return (
    <a href="/dev/realtime-debug" className={className}>
      <Badge variant={getVariant()} className="flex items-center gap-1 text-xs">
        {getIcon()}
        Realtime: {getStatusText()}
      </Badge>
    </a>
  );
}