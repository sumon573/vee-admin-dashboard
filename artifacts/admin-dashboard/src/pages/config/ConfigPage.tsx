import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, ToggleLeft, ToggleRight, Wrench } from 'lucide-react';
import { ref, get, set } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface FeatureFlags {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  forceUpdate?: boolean;
  minAppVersion?: string;
  giftsEnabled?: boolean;
  voiceRoomsEnabled?: boolean;
  registrationEnabled?: boolean;
}

async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const snapshot = await get(ref(database, 'config/feature_flags'));
    return snapshot.exists() ? snapshot.val() : {};
  } catch {
    return {};
  }
}

async function updateFlag(key: string, value: any) {
  await set(ref(database, `config/feature_flags/${key}`), value);
  await set(ref(database, `admin_audit/${Date.now()}`), {
    action: 'update_feature_flag',
    details: `${key} = ${JSON.stringify(value)}`,
    timestamp: Date.now(),
  });
}

const flagDescriptions: Record<string, string> = {
  maintenanceMode: 'Put app in maintenance mode (users see message)',
  forceUpdate: 'Force users to update to latest version',
  giftsEnabled: 'Enable/disable gift sending',
  voiceRoomsEnabled: 'Enable/disable voice rooms',
  registrationEnabled: 'Allow new user registrations',
};

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [minVersion, setMinVersion] = useState('');
  
  const { data: flags, isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: getFeatureFlags,
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => updateFlag(key, value),
    onSuccess: () => {
      toast.success('Setting updated');
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
    onError: () => toast.error('Failed to update'),
  });
  
  const toggleFlag = (key: string, current: boolean) => {
    updateMutation.mutate({ key, value: !current });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" /> System Config
        </h1>
        <p className="text-muted-foreground mt-1">Feature flags and system settings</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Maintenance
          </CardTitle>
          <CardDescription>Control app availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Skeleton className="h-12 w-full" /> : (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Maintenance Mode</div>
                  <div className="text-sm text-muted-foreground">{flagDescriptions.maintenanceMode}</div>
                </div>
                <Switch
                  checked={!!flags?.maintenanceMode}
                  onCheckedChange={() => toggleFlag('maintenanceMode', !!flags?.maintenanceMode)}
                />
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Maintenance message..."
                  value={maintenanceMsg || flags?.maintenanceMessage || ''}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                />
                <Button
                  onClick={() => {
                    updateMutation.mutate({ key: 'maintenanceMessage', value: maintenanceMsg });
                    setMaintenanceMsg('');
                  }}
                  disabled={!maintenanceMsg}
                >
                  Set Message
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Force Update</div>
                  <div className="text-sm text-muted-foreground">{flagDescriptions.forceUpdate}</div>
                </div>
                <Switch
                  checked={!!flags?.forceUpdate}
                  onCheckedChange={() => toggleFlag('forceUpdate', !!flags?.forceUpdate)}
                />
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Min version (e.g., 1.2.0)"
                  value={minVersion || flags?.minAppVersion || ''}
                  onChange={(e) => setMinVersion(e.target.value)}
                />
                <Button
                  onClick={() => {
                    updateMutation.mutate({ key: 'minAppVersion', value: minVersion });
                    setMinVersion('');
                  }}
                  disabled={!minVersion}
                >
                  Set Version
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ToggleLeft className="h-5 w-5" /> Feature Flags
          </CardTitle>
          <CardDescription>Enable/disable app features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            ['giftsEnabled', 'voiceRoomsEnabled', 'registrationEnabled'].map((key) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="text-sm text-muted-foreground">{flagDescriptions[key]}</div>
                </div>
                <div className="flex items-center gap-2">
                  {flags?.[key as keyof FeatureFlags] ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                  <Switch
                    checked={!!flags?.[key as keyof FeatureFlags]}
                    onCheckedChange={() => toggleFlag(key, !!flags?.[key as keyof FeatureFlags])}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
