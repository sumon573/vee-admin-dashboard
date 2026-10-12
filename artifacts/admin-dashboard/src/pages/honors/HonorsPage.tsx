import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Search, Plus, X, Crown, Medal, Star } from 'lucide-react';
import { ref, get, set, remove } from 'firebase/database';
import { rtdb as database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Honor {
  id: string;
  name: string;
  type: 'badge' | 'frame' | 'nameplate';
  icon?: string;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserHonor {
  honorId: string;
  type?: 'badge' | 'frame' | 'nameplate';
  grantedAt?: number;
  obtainedAt?: number;
  expiresAt?: number;
  validity?: 'permanent' | number;
  grantedBy?: string;
}

async function getHonors(): Promise<Honor[]> {
  try {
    const snapshot = await get(ref(database, 'honors_catalog'));
    if (!snapshot.exists()) return [];
    const honors: Honor[] = [];
    snapshot.forEach((child) => {
      honors.push({ id: child.key!, ...child.val() });
    });
    return honors;
  } catch {
    return [];
  }
}

async function getUserHonors(uid: string): Promise<UserHonor[]> {
  try {
    // 2026-10-13: Read from app's paths (badges, frames, nameplates)
    const honors: UserHonor[] = [];
    for (const node of ['badges', 'frames', 'nameplates'] as const) {
      const snapshot = await get(ref(database, `users/${uid}/${node}`));
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          honors.push({ honorId: child.key!, type: node.slice(0, -1) as 'badge' | 'frame' | 'nameplate', ...child.val() });
        });
      }
    }
    return honors;
  } catch {
    return [];
  }
}

async function grantHonor(uid: string, honorId: string, expiresAt?: number) {
  // 2026-10-13: Write to the app's expected paths (users/{uid}/badges|frames|nameplates)
  // with the GrantedBadge/GrantedFrame format. Official manual grants use source: 'official'.
  const honorSnap = await get(ref(database, `honors_catalog/${honorId}`));
  if (!honorSnap.exists()) throw new Error('Honor not found in catalog');
  const honor = honorSnap.val() as { name: string; type: 'badge' | 'frame' | 'nameplate'; icon?: string; description?: string };
  
  const node = honor.type === 'badge' ? 'badges' : honor.type === 'frame' ? 'frames' : 'nameplates';
  const honorRef = ref(database, `users/${uid}/${node}/${honorId}`);
  await set(honorRef, {
    id: honorId,
    name: honor.name,
    ...(honor.icon && { icon: honor.icon }),
    ...(honor.description && { description: honor.description }),
    obtainedAt: Date.now(),
    validity: expiresAt ? expiresAt : 'permanent',
    source: 'official',
    grantedBy: 'admin',
  });
  
  // Audit log
  await set(ref(database, `admin_audit/${Date.now()}`), {
    action: 'grant_honor',
    targetUid: uid,
    honorId,
    timestamp: Date.now(),
  });
}

async function revokeHonor(uid: string, honorId: string, type?: 'badge' | 'frame' | 'nameplate') {
  // 2026-10-13: Remove from the correct app path. If type unknown, try all three.
  const nodes = type ? [type === 'badge' ? 'badges' : type === 'frame' ? 'frames' : 'nameplates'] : ['badges', 'frames', 'nameplates'];
  for (const node of nodes) {
    await remove(ref(database, `users/${uid}/${node}/${honorId}`));
  }
  
  // Audit log
  await set(ref(database, `admin_audit/${Date.now()}`), {
    action: 'revoke_honor',
    targetUid: uid,
    honorId,
    timestamp: Date.now(),
  });
}

export default function HonorsPage() {
  const [searchUid, setSearchUid] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [grantDialog, setGrantDialog] = useState(false);
  const [selectedHonor, setSelectedHonor] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const [expiryUnit, setExpiryUnit] = useState<'hours' | 'days' | 'months' | 'years' | 'permanent'>('permanent');
  
  const queryClient = useQueryClient();
  
  const { data: honors, isLoading: honorsLoading } = useQuery({
    queryKey: ['honors-catalog'],
    queryFn: getHonors,
    staleTime: 60 * 1000,
  });
  
  const { data: userHonors, isLoading: userHonorsLoading } = useQuery({
    queryKey: ['user-honors', selectedUid],
    queryFn: () => getUserHonors(selectedUid),
    enabled: !!selectedUid,
  });
  
  const grantMutation = useMutation({
    mutationFn: ({ uid, honorId, expiresAt }: { uid: string; honorId: string; expiresAt?: number }) =>
      grantHonor(uid, honorId, expiresAt),
    onSuccess: () => {
      toast.success('Honor granted successfully');
      queryClient.invalidateQueries({ queryKey: ['user-honors', selectedUid] });
      setGrantDialog(false);
    },
    onError: () => toast.error('Failed to grant honor'),
  });
  
  const revokeMutation = useMutation({
    mutationFn: ({ uid, honorId }: { uid: string; honorId: string }) =>
      revokeHonor(uid, honorId),
    onSuccess: () => {
      toast.success('Honor revoked');
      queryClient.invalidateQueries({ queryKey: ['user-honors', selectedUid] });
    },
    onError: () => toast.error('Failed to revoke honor'),
  });
  
  const handleGrant = () => {
    if (!selectedUid || !selectedHonor) return;
    // 2026-10-13 (Sumon): custom validity — hours/days/months/years/permanent.
    let expiresAt: number | undefined;
    if (expiryUnit !== 'permanent' && expiryValue) {
      const v = parseInt(expiryValue);
      const ms = expiryUnit === 'hours' ? v * 60 * 60 * 1000
        : expiryUnit === 'days' ? v * 24 * 60 * 60 * 1000
        : expiryUnit === 'months' ? v * 30 * 24 * 60 * 60 * 1000
        : v * 365 * 24 * 60 * 60 * 1000;
      expiresAt = Date.now() + ms;
    }
    grantMutation.mutate({ uid: selectedUid, honorId: selectedHonor, expiresAt });
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'badge': return <Medal className="h-4 w-4" />;
      case 'frame': return <Crown className="h-4 w-4" />;
      case 'nameplate': return <Star className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };
  
  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Award className="h-8 w-8" /> Honor & Decoration
        </h1>
        <p className="text-muted-foreground mt-1">
          Grant and manage badges, frames, and nameplates
        </p>
      </div>
      
      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle>Find User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter user UID..."
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setSelectedUid(searchUid)} disabled={!searchUid}>
              Load Honors
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {selectedUid && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Honors: {selectedUid.substring(0, 12)}...</CardTitle>
              <Button onClick={() => setGrantDialog(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Grant Honor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {userHonorsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : !userHonors || userHonors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No honors granted yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {userHonors.map((uh) => {
                  const honor = honors?.find(h => h.id === uh.honorId);
                  return (
                    <div key={uh.honorId} className="p-3 rounded-lg border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(honor?.type || 'badge')}
                        <div>
                          <div className="font-medium">{honor?.name || uh.honorId}</div>
                          <div className="text-xs text-muted-foreground">
                            Granted {new Date(uh.grantedAt).toLocaleDateString()}
                            {uh.expiresAt && ` • Expires ${new Date(uh.expiresAt).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {honor?.rarity && (
                          <Badge className={getRarityColor(honor.rarity)}>{honor.rarity}</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate({ uid: selectedUid, honorId: uh.honorId })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Honors Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Honors Catalog ({honors?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {honorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {honors?.map((honor) => (
                <div key={honor.id} className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(honor.type)}
                    <span className="font-medium">{honor.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{honor.type}</Badge>
                    {honor.rarity && <Badge className={getRarityColor(honor.rarity)}>{honor.rarity}</Badge>}
                  </div>
                  {honor.description && (
                    <p className="text-sm text-muted-foreground mt-2">{honor.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Grant Dialog */}
      <Dialog open={grantDialog} onOpenChange={setGrantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Honor</DialogTitle>
            <DialogDescription>
              Grant an honor to user {selectedUid.substring(0, 12)}...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Honor</label>
              <Select value={selectedHonor} onValueChange={setSelectedHonor}>
                <SelectTrigger><SelectValue placeholder="Choose honor..." /></SelectTrigger>
                <SelectContent>
                  {honors?.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name} ({h.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Validity</label>
              <div className="flex gap-2">
                <Select value={expiryUnit} onValueChange={(v) => setExpiryUnit(v as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
                {expiryUnit !== 'permanent' && (
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(e.target.value)}
                    className="flex-1"
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog(false)}>Cancel</Button>
            <Button onClick={handleGrant} disabled={!selectedHonor || grantMutation.isPending}>
              {grantMutation.isPending ? 'Granting...' : 'Grant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
