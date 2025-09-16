import { Database, HardDrive, UserCircle, ChevronDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState, useEffect } from 'react';
import { useDataSource, DataSource } from '@/state/dataSource';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const dataSourceConfig = {
  supabase: {
    label: 'Supabase',
    icon: Database,
    description: 'Datos almacenados en Supabase (sincronizado, persistente)'
  },
  local: {
    label: 'Local',
    icon: HardDrive,
    description: 'Datos almacenados localmente en el navegador'
  },
  guest: {
    label: 'Guest',
    icon: UserCircle,
    description: 'Modo invitado (local, sin persistencia)'
  }
};

export function DataSourceSelector() {
  const { state, setDataSource, getRepoHealth } = useDataSource();
  const { isAuthenticated } = useSupabaseAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingSource, setPendingSource] = useState<DataSource | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    if (state.source === 'supabase') {
      getRepoHealth().then(setHealth).catch(console.error);
    }
  }, [state.source, getRepoHealth]);

  const getBadgeVariant = () => {
    if (state.source === 'supabase') {
      if (!health) return 'secondary';
      if (health.ok && isAuthenticated) return 'default';
      if (health.errors.length > 0) return 'destructive';
      return 'secondary';
    }
    if (state.source === 'guest') return 'secondary';
    return 'outline';
  };

  const getBadgeIcon = () => {
    if (state.source === 'supabase') {
      if (!health) return <Clock className="h-3 w-3 mr-1" />;
      if (health.ok && isAuthenticated) return <CheckCircle className="h-3 w-3 mr-1" />;
      if (health.errors.length > 0) return <AlertCircle className="h-3 w-3 mr-1" />;
      return <Database className="h-3 w-3 mr-1" />;
    }
    const IconComponent = dataSourceConfig[state.source].icon;
    return <IconComponent className="h-3 w-3 mr-1" />;
  };

  const handleSourceSelect = (source: DataSource) => {
    if (source === state.source) return;
    
    setPendingSource(source);
    setIsDialogOpen(true);
  };

  const confirmSourceChange = async () => {
    if (pendingSource) {
      await setDataSource(pendingSource);
      setIsDialogOpen(false);
      setPendingSource(null);
      
      // Refresh health after change
      if (pendingSource === 'supabase') {
        getRepoHealth().then(setHealth).catch(console.error);
      }
    }
  };

  const cancelSourceChange = () => {
    setIsDialogOpen(false);
    setPendingSource(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Badge variant={getBadgeVariant()} className="text-xs mr-2">
              {getBadgeIcon()}
              {dataSourceConfig[state.source].label}
            </Badge>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 bg-popover border border-border shadow-lg"
        >
          {Object.entries(dataSourceConfig).map(([key, config]) => {
            const IconComponent = config.icon;
            const isActive = state.source === key;
            
            return (
              <DropdownMenuItem
                key={key}
                onClick={() => handleSourceSelect(key as DataSource)}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center w-full">
                  <IconComponent className="h-4 w-4 mr-2" />
                  <span className="font-medium">{config.label}</span>
                  {isActive && <CheckCircle className="h-4 w-4 ml-auto text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {config.description}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar fuente de datos</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cambiar fuente de datos a <strong>{pendingSource && dataSourceConfig[pendingSource].label}</strong>?
              <br /><br />
              Esto afectará dónde se guardan y leen perfiles, runs y logs. Los datos existentes 
              en otras fuentes no se migrarán automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelSourceChange}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSourceChange}>
              Confirmar cambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}