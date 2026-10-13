import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Search, Plus, X, Crown, Medal, Star, ShieldCheck } from 'lucide-react';
import { ref, get, set, remove } from 'firebase/database';
import { rtdb as database } from '@/config/firebase';
import { usePermissions } from '@/hooks/usePermissions';
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
  /** 2026-10-13 (Sumon): true = super-admin only (e.g. Vee Official badge). Admins/moderators cannot grant. */
  restricted?: boolean;
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

/**
 * 2026-10-13 (Sumon): Get all users holding a specific honor.
 * Returns list of {uid, name, photoURL, vId, obtainedAt}.
 */
async function getHonorHolders(
  honorId: string,
  type: 'badge' | 'frame' | 'nameplate',
): Promise<Array<{ uid: string; name: string; photoURL: string; vId: string; obtainedAt: number }>> {
  const node = type === 'badge' ? 'badges' : type === 'frame' ? 'frames' : 'nameplates';
  const usersSnap = await get(ref(database, 'users'));
  if (!usersSnap.exists()) return [];
  const holders: Array<{ uid: string; name: string; photoURL: string; vId: string; obtainedAt: number }> = [];
  usersSnap.forEach((userChild) => {
    const uid = userChild.key!;
    const userData = userChild.val();
    const honor = userData?.[node]?.[honorId];
    if (honor) {
      holders.push({
        uid,
        name: userData.name || 'Unknown',
        photoURL: userData.photoURL || '',
        vId: userData.vId || '',
        obtainedAt: honor.obtainedAt || 0,
      });
    }
  });
  // Newest first
  holders.sort((a, b) => b.obtainedAt - a.obtainedAt);
  return holders;
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

  // 2026-10-13 (Sumon): Congratulations notification for the recipient.
  const notifType = honor.type === 'frame' ? 'frame' : 'honor';
  await set(ref(database, `notifications/${uid}/${Date.now()}`), {
    type: 'honor_granted',
    honorType: notifType,
    honorId,
    honorName: honor.name,
    honorIcon: honor.icon || '',
    title: 'Congratulations!',
    body: notifType === 'frame' ? 'Got New Frame' : 'Got New Honor',
    timestamp: Date.now(),
    read: false,
  });
}

async function revokeHonor(uid: string, honorId: string, type?: 'badge' | 'frame' | 'nameplate') {
  // 2026-10-13: Remove from the correct app path. If type unknown, try all three.
  const nodes = type ? [type === 'badge' ? 'badges' : type === 'frame' ? 'frames' : 'nameplates'] : ['badges', 'frames', 'nameplates'];
  for (const node of nodes) {
    await remove(ref(database, `users/${uid}/${node}/${honorId}`));
  }

  // 2026-10-13 (Sumon): If revoking a frame that is currently ACTIVE,
  // also clear users/{uid}/activeFrame — otherwise the frame stays visible on DP.
  if (!type || type === 'frame') {
    try {
      const activeSnap = await get(ref(database, `users/${uid}/activeFrame`));
      if (activeSnap.exists() && activeSnap.val() === honorId) {
        await remove(ref(database, `users/${uid}/activeFrame`));
      }
    } catch { /* non-critical */ }
  }

  // Audit log
  await set(ref(database, `admin_audit/${Date.now()}`), {
    action: 'revoke_honor',
    targetUid: uid,
    honorId,
    timestamp: Date.now(),
  });
}

/** 2026-10-13 (Sumon): Update validity/expiry of a granted honor. */
async function updateHonorValidity(
  uid: string,
  honorId: string,
  type: 'badge' | 'frame' | 'nameplate',
  expiresAt: number | 'permanent',
) {
  const node = type === 'badge' ? 'badges' : type === 'frame' ? 'frames' : 'nameplates';
  const honorRef = ref(database, `users/${uid}/${node}/${honorId}`);
  const snap = await get(honorRef);
  if (!snap.exists()) throw new Error('Honor not found');
  await set(honorRef, {
    ...snap.val(),
    validity: expiresAt === 'permanent' ? 'permanent' : expiresAt,
    ...(expiresAt !== 'permanent' ? { expiresAt } : {}),
  });
  await set(ref(database, `admin_audit/${Date.now()}`), {
    action: 'update_honor_validity',
    targetUid: uid,
    honorId,
    expiresAt: expiresAt === 'permanent' ? 'permanent' : expiresAt,
    timestamp: Date.now(),
  });
}

export default function HonorsPage() {
  const { isSuperAdmin } = usePermissions();
  const [searchUid, setSearchUid] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const [resolving, setResolving] = useState(false);
  const [grantDialog, setGrantDialog] = useState(false);
  const [selectedHonor, setSelectedHonor] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const [expiryUnit, setExpiryUnit] = useState<'hours' | 'days' | 'months' | 'years' | 'permanent'>('permanent');
  // 2026-10-13 (Sumon): Edit validity dialog state
  const [editValidityDialog, setEditValidityDialog] = useState<{ honorId: string; type: 'badge' | 'frame' | 'nameplate'; current: string } | null>(null);
  const [editExpiryValue, setEditExpiryValue] = useState('');
  const [editExpiryUnit, setEditExpiryUnit] = useState<'hours' | 'days' | 'months' | 'years' | 'permanent'>('permanent');
  // 2026-10-13 (Sumon): Selected user profile (name + DP)
  const [selectedUserProfile, setSelectedUserProfile] = useState<{ name: string; photoURL: string; vId: string } | null>(null);
  // 2026-10-13 (Sumon): Holders dialog — who received each honor
  const [holdersDialog, setHoldersDialog] = useState<{ honorId: string; name: string; type: 'badge' | 'frame' | 'nameplate' } | null>(null);
  // 2026-10-13 (Sumon): catalog tabs + search.
  const [catalogTab, setCatalogTab] = useState<'badge' | 'frame' | 'nameplate'>('badge');
  const [catalogSearch, setCatalogSearch] = useState('');
  // 2026-10-13 (Sumon): Add-to-catalog form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRestricted, setNewRestricted] = useState(false);
  
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

  // 2026-10-13 (Sumon): Update validity mutation
  const updateValidityMutation = useMutation({
    mutationFn: ({ uid, honorId, type, expiresAt }: {
      uid: string; honorId: string; type: 'badge' | 'frame' | 'nameplate'; expiresAt: number | 'permanent';
    }) => updateHonorValidity(uid, honorId, type, expiresAt),
    onSuccess: () => {
      toast.success('Validity updated');
      queryClient.invalidateQueries({ queryKey: ['user-honors', selectedUid] });
      setEditValidityDialog(null);
    },
    onError: () => toast.error('Failed to update validity'),
  });

  // 2026-10-13 (Sumon): Fetch user profile when UID selected
  const { data: userProfile } = useQuery({
    queryKey: ['honor-user-profile', selectedUid],
    queryFn: async () => {
      if (!selectedUid) return null;
      const { getUserById } = await import('@/services/userService');
      return getUserById(selectedUid);
    },
    enabled: !!selectedUid,
  });
  
  const handleGrant = () => {
    if (!selectedUid || !selectedHonor) return;
    // 2026-10-13 (Sumon): special (restricted) honors — super-admin only.
    const honor = honors?.find((h) => h.id === selectedHonor);
    if (honor?.restricted && !isSuperAdmin) {
      toast.error('This is a special honor — only the super admin can grant it.');
      return;
    }
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
                placeholder="Enter user UID or vId (e.g. v7809825)..."
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={async () => {
                const input = searchUid.trim();
                if (!input) return;
                // If input looks like a vId (v + digits), resolve to UID first
                if (/^v\d+$/i.test(input)) {
                  setResolving(true);
                  try {
                    const { getUidByVId } = await import('@/services/userService');
                    const uid = await getUidByVId(input);
                    if (uid) {
                      setSelectedUid(uid);
                    } else {
                      toast.error(`No user found with vId ${input}`);
                    }
                  } catch {
                    toast.error('Failed to resolve vId');
                  } finally {
                    setResolving(false);
                  }
                } else {
                  setSelectedUid(input);
                }
              }}
              disabled={!searchUid || resolving}
            >
              {resolving ? 'Resolving...' : 'Load Honors'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {selectedUid && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-bold">{userProfile?.name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                )}
                <div>
                  <div>{userProfile?.name || selectedUid.substring(0, 12) + '...'}</div>
                  {userProfile?.vId && (
                    <div className="text-xs text-muted-foreground font-normal">vId: {userProfile.vId}</div>
                  )}
                </div>
              </CardTitle>
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
                            Granted {new Date(uh.obtainedAt ?? uh.grantedAt ?? 0).toLocaleDateString()}
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
                          title="Edit validity"
                          onClick={() => {
                            const t = uh.type || honor?.type || 'badge';
                            setEditValidityDialog({
                              honorId: uh.honorId,
                              type: t as 'badge' | 'frame' | 'nameplate',
                              current: uh.validity === 'permanent' ? 'Permanent' : uh.expiresAt ? new Date(uh.expiresAt).toLocaleDateString() : 'Unknown',
                            });
                            setEditExpiryUnit('permanent');
                            setEditExpiryValue('');
                          }}
                        >
                          ⏱
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Remove honor"
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
      
      {/* Honors Catalog — 2026-10-13 (Sumon): tabs (Badges/Frames/Nameplates) + search by name.
          Special (restricted) honors show a shield and are super-admin only. */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Honors Catalog</CardTitle>
            {/* 2026-10-13 (Sumon): Add new badge/frame to catalog */}
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {(['badge', 'frame', 'nameplate'] as const).map((t) => (
              <Button
                key={t}
                variant={catalogTab === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCatalogTab(t)}
              >
                {t === 'badge' ? 'Badges' : t === 'frame' ? 'Frames' : 'Nameplates'}
              </Button>
            ))}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {honorsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (() => {
            const filtered = (honors || [])
              .filter((h) => h.type === catalogTab)
              .filter((h) => !catalogSearch || h.name.toLowerCase().includes(catalogSearch.toLowerCase()));
            return filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">No {catalogTab}s found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {filtered.map((honor) => {
                  const locked = honor.restricted && !isSuperAdmin;
                  return (
                    <div key={honor.id} className={`p-4 rounded-lg border ${locked ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(honor.type)}
                        <span className="font-medium">{honor.name}</span>
                        {honor.restricted && (
                          <Badge className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Special
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{honor.type}</Badge>
                        {honor.rarity && <Badge className={getRarityColor(honor.rarity)}>{honor.rarity}</Badge>}
                      </div>
                      {honor.description && (
                        <p className="text-sm text-muted-foreground mt-2">{honor.description}</p>
                      )}
                      {locked && (
                        <p className="text-xs text-purple-700 mt-2">Only the super admin can grant this.</p>
                      )}
                      {/* 2026-10-13 (Sumon): Holders — who received this honor */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => setHoldersDialog({ honorId: honor.id, name: honor.name, type: honor.type })}
                      >
                        👥 View Holders
                      </Button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                    <SelectItem key={h.id} value={h.id} disabled={h.restricted && !isSuperAdmin}>
                      {h.name} ({h.type}){h.restricted ? ' 🛡️ Special' : ''}
                    </SelectItem>
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

      {/* Edit Validity Dialog — 2026-10-13 (Sumon): change/reduce/extend honor validity */}
      <Dialog open={!!editValidityDialog} onOpenChange={(o) => !o && setEditValidityDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Validity</DialogTitle>
            <DialogDescription>
              Current: {editValidityDialog?.current} — set new validity for this honor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Select value={editExpiryUnit} onValueChange={(v: any) => setEditExpiryUnit(v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="months">Months</SelectItem>
                <SelectItem value="years">Years</SelectItem>
              </SelectContent>
            </Select>
            {editExpiryUnit !== 'permanent' && (
              <Input
                type="number"
                min="1"
                placeholder="Amount"
                value={editExpiryValue}
                onChange={(e) => setEditExpiryValue(e.target.value)}
                className="flex-1"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditValidityDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editValidityDialog || !selectedUid) return;
                let expiresAt: number | 'permanent' = 'permanent';
                if (editExpiryUnit !== 'permanent' && editExpiryValue) {
                  const v = parseInt(editExpiryValue);
                  const ms = editExpiryUnit === 'hours' ? v * 60 * 60 * 1000
                    : editExpiryUnit === 'days' ? v * 24 * 60 * 60 * 1000
                    : editExpiryUnit === 'months' ? v * 30 * 24 * 60 * 60 * 1000
                    : v * 365 * 24 * 60 * 60 * 1000;
                  expiresAt = Date.now() + ms;
                }
                updateValidityMutation.mutate({
                  uid: selectedUid,
                  honorId: editValidityDialog.honorId,
                  type: editValidityDialog.type,
                  expiresAt,
                });
              }}
              disabled={updateValidityMutation.isPending || (editExpiryUnit !== 'permanent' && !editExpiryValue)}
            >
              {updateValidityMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Catalog Dialog — 2026-10-13 (Sumon) */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {catalogTab === 'badge' ? 'Badge' : catalogTab === 'frame' ? 'Frame' : 'Nameplate'}</DialogTitle>
            <DialogDescription>Add a new honor to the catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                placeholder="e.g. Vee Official"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Icon URL</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                placeholder="https://..."
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                placeholder="e.g. Grant to Vee Official Team"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="restricted"
                checked={newRestricted}
                onChange={(e) => setNewRestricted(e.target.checked)}
              />
              <label htmlFor="restricted" className="text-sm">🛡️ Special (super-admin only)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!newName.trim()) return;
                const id = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                await set(ref(database, `honors_catalog/${id}`), {
                  name: newName.trim(),
                  type: catalogTab,
                  ...(newIcon.trim() && { icon: newIcon.trim() }),
                  ...(newDesc.trim() && { description: newDesc.trim() }),
                  ...(newRestricted && { restricted: true }),
                  createdAt: Date.now(),
                });
                // 2026-10-13 (Sumon): Refresh catalog list after add — items must stay visible permanently
                queryClient.invalidateQueries({ queryKey: ['honors-catalog'] });
                toast.success('Added to catalog');
                setNewName(''); setNewIcon(''); setNewDesc(''); setNewRestricted(false);
                setShowAddForm(false);
              }}
              disabled={!newName.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Holders Dialog — 2026-10-13 (Sumon): who received this honor */}
      <Dialog open={!!holdersDialog} onOpenChange={(o) => !o && setHoldersDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>👥 {holdersDialog?.name} — Holders</DialogTitle>
            <DialogDescription>
              All users who received this {holdersDialog?.type}.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const { data: holders, isLoading } = useQuery({
              queryKey: ['honor-holders', holdersDialog?.honorId, holdersDialog?.type],
              queryFn: () => holdersDialog ? getHonorHolders(holdersDialog.honorId, holdersDialog.type) : [],
              enabled: !!holdersDialog,
            });
            if (isLoading) return <p className="text-center py-4">Loading...</p>;
            if (!holders || holders.length === 0) {
              return <p className="text-center text-muted-foreground py-4">No holders yet</p>;
            }
            return (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {holders.map((h) => (
                  <div key={h.uid} className="flex items-center gap-3 p-2 rounded-lg border">
                    {h.photoURL ? (
                      <img src={h.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="font-bold">{h.name[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.vId ? `vId: ${h.vId} • ` : ''}Obtained {new Date(h.obtainedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldersDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
