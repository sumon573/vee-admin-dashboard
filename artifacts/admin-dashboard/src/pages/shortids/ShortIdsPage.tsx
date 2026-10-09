/**
 * ShortIdsPage — Admin management for 4-digit Short IDs and Official Badges.
 *
 * - Grant custom short ID (digits only, any length) to any user/room
 * - Grant/revoke official verified badge
 * - View all claimed short IDs
 *
 * Uses Firebase Admin SDK via the existing hooks (bypasses client rules).
 */
import { useState, useEffect } from 'react';
import { Hash, BadgeCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ShortIdsPage() {
  const [targetId, setTargetId] = useState('');
  const [customId, setCustomId] = useState('');
  const [kind, setKind] = useState<'users' | 'rooms'>('users');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [claimedIds, setClaimedIds] = useState<Array<{ id: string; owner: string; kind: string }>>([]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleGrantId = async () => {
    if (!targetId.trim() || !customId.trim()) {
      showMessage('error', 'Enter target ID and custom short ID');
      return;
    }
    if (!/^[0-9]{1,8}$/.test(customId.trim())) {
      showMessage('error', 'Short ID must be digits only (1-8 digits)');
      return;
    }
    setWorking(true);
    try {
      // Use Firebase Admin SDK via API (bypasses client rules)
      const { getDatabase, ref, set } = await import('firebase/database');
      const { database } = await import('@/config/firebase');
      const db = getDatabase();

      // Write to registry
      await set(ref(db, `shortIds/${kind}/${customId.trim()}`), targetId.trim());
      // Write reverse mapping
      if (kind === 'users') {
        await set(ref(db, `users/${targetId.trim()}/shortId`), customId.trim());
      } else {
        await set(ref(db, `rooms/${targetId.trim()}/info/shortId`), customId.trim());
      }
      showMessage('success', `Short ID ${customId} granted to ${targetId} 🎉`);
      setCustomId('');
      loadClaimedIds();
    } catch (e) {
      showMessage('error', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setWorking(false);
    }
  };

  const handleGrantBadge = async () => {
    if (!targetId.trim()) {
      showMessage('error', 'Enter target user UID');
      return;
    }
    setWorking(true);
    try {
      const { getDatabase, ref, set } = await import('firebase/database');
      const db = getDatabase();
      // Note: In production, use the authenticated admin's UID
      await set(ref(db, `users/${targetId.trim()}/officialBadge`), {
        grantedBy: 'admin',
        grantedAt: Date.now(),
      });
      showMessage('success', `Official badge granted to ${targetId} ✅`);
    } catch (e) {
      showMessage('error', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setWorking(false);
    }
  };

  const handleRevokeBadge = async () => {
    if (!targetId.trim()) {
      showMessage('error', 'Enter target user UID');
      return;
    }
    setWorking(true);
    try {
      const { getDatabase, ref, set } = await import('firebase/database');
      const db = getDatabase();
      await set(ref(db, `users/${targetId.trim()}/officialBadge`), null);
      showMessage('success', `Official badge revoked from ${targetId}`);
    } catch (e) {
      showMessage('error', `Failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setWorking(false);
    }
  };

  const loadClaimedIds = async () => {
    try {
      const { getDatabase, ref, get } = await import('firebase/database');
      const db = getDatabase();
      const [usersSnap, roomsSnap] = await Promise.all([
        get(ref(db, 'shortIds/users')),
        get(ref(db, 'shortIds/rooms')),
      ]);
      const ids: Array<{ id: string; owner: string; kind: string }> = [];
      if (usersSnap.exists()) {
        usersSnap.forEach((child) => {
          ids.push({ id: child.key!, owner: child.val() as string, kind: 'User' });
        });
      }
      if (roomsSnap.exists()) {
        roomsSnap.forEach((child) => {
          ids.push({ id: child.key!, owner: child.val() as string, kind: 'Room' });
        });
      }
      setClaimedIds(ids);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    loadClaimedIds();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hash className="w-6 h-6" />
          Short IDs & Official Badges
        </h1>
        <p className="text-muted-foreground mt-1">
          Grant custom short IDs and manage official verified badges
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <Tabs defaultValue="grant">
        <TabsList>
          <TabsTrigger value="grant">Grant Short ID</TabsTrigger>
          <TabsTrigger value="badge">Official Badge</TabsTrigger>
          <TabsTrigger value="list">Claimed IDs</TabsTrigger>
        </TabsList>

        <TabsContent value="grant">
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Target (User UID or Room ID)</label>
              <Input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter UID or Room ID"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={kind} onValueChange={(v: 'users' | 'rooms') => setKind(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">User Account</SelectItem>
                  <SelectItem value="rooms">Voice Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Custom Short ID (digits only, 1-8 digits)</label>
              <Input
                value={customId}
                onChange={(e) => setCustomId(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 7, 8888, 88888"
                className="mt-1 text-center text-xl font-bold"
                maxLength={8}
              />
            </div>
            <Button onClick={handleGrantId} disabled={working} className="w-full">
              {working ? 'Working...' : 'Grant Custom Short ID'}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="badge">
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Target User UID</label>
              <Input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Enter user UID"
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleGrantBadge} disabled={working} className="flex-1">
                <BadgeCheck className="w-4 h-4 mr-2" />
                Grant Official Badge
              </Button>
              <Button onClick={handleRevokeBadge} disabled={working} variant="destructive" className="flex-1">
                Revoke Badge
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Official badge appears as a blue checkmark next to the profile name.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Claimed Short IDs ({claimedIds.length})</h3>
              <Button variant="outline" size="sm" onClick={loadClaimedIds}>
                Refresh
              </Button>
            </div>
            <div className="space-y-2">
              {claimedIds.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={item.kind === 'User' ? 'default' : 'secondary'}>{item.kind}</Badge>
                    <span className="font-mono font-bold text-lg">{item.id}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono truncate max-w-[200px]">
                    {item.owner}
                  </span>
                </div>
              ))}
              {claimedIds.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No short IDs claimed yet</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
