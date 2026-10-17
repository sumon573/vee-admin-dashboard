import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, CheckCircle2, AlertTriangle, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAppAuth } from '@/contexts/AuthContext';
import { getVeeTeamStatus, initializeVeeTeam, sendSystemNotice } from '@/services/veeTeamService';
import { getAllUsers } from '@/services/userService';
import type { AppUser } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SystemNoticesPage() {
  const { appUser } = useAppAuth();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'users'>('all');
  // 2026-10-17 (Sumon): Specific users — searchable picker with DP + name + V ID.
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);

  const { data: initialized, isLoading: statusLoading } = useQuery({
    queryKey: ['vee-team-status'],
    queryFn: getVeeTeamStatus,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-notice'],
    queryFn: getAllUsers,
    enabled: target === 'users',
  });

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allUsers.filter((u) => u.uid !== 'vee_team');
    if (!q) return list.slice(0, 20);
    return list.filter((u) =>
      (u.vId || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allUsers, searchQuery]);

  const toggleUser = (user: AppUser) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.uid === user.uid)
        ? prev.filter((u) => u.uid !== user.uid)
        : [...prev, user]
    );
  };

  const removeUser = (uid: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.uid !== uid));
  };

  const initMutation = useMutation({
    mutationFn: () => {
      if (!appUser) throw new Error('Not authenticated');
      return initializeVeeTeam(appUser.uid, appUser.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vee-team-status'] });
      toast.success('Vee Team account initialized');
    },
    onError: () => toast.error('Failed to initialize Vee Team'),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!appUser) throw new Error('Not authenticated');
      const text = message.trim();
      if (!text) throw new Error('Message is empty');
      let targets: string[];
      if (target === 'all') {
        const users = await getAllUsers();
        targets = users.map((u) => u.uid).filter((uid) => uid && uid !== 'vee_team');
      } else {
        targets = selectedUsers.map((u) => u.uid);
      }
      if (targets.length === 0) throw new Error('No recipients selected');
      return sendSystemNotice(targets, text, appUser.uid, appUser.name);
    },
    onSuccess: (res) => {
      toast.success(`Notice sent to ${res.sent} users${res.failed ? ` (${res.failed} failed)` : ''}`);
      setMessage('');
      setSelectedUsers([]);
      setSearchQuery('');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to send notice'),
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          System Notices
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send official notices from the <span className="font-medium text-foreground">Vee Team</span> system account.
          Users cannot reply to these messages.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                Vee Team
                {initialized ? (
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Not initialized
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Official system account for notices & warnings</p>
            </div>
          </div>
          {!statusLoading && !initialized && (
            <Button onClick={() => initMutation.mutate()} disabled={initMutation.isPending}>
              {initMutation.isPending ? 'Initializing…' : 'Initialize Account'}
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Compose Notice</h2>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write the official notice… (e.g. maintenance announcement, rule reminder, warning)"
          rows={4}
          maxLength={2000}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={target} onValueChange={(v) => setTarget(v as 'all' | 'users')}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="users">Specific users</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !message.trim() || !initialized || (target === 'users' && selectedUsers.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? 'Sending…' : 'Send as Vee Team'}
          </Button>
        </div>

        {/* 2026-10-17 (Sumon): Searchable user picker — search by V ID, name, or UID. Shows DP + name + V ID. */}
        {target === 'users' && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by V ID, name, or UID…"
                className="pl-9"
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <Badge key={u.uid} className="flex items-center gap-1.5 pr-1 py-1 pl-1">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs">{u.name || 'Unnamed'}</span>
                    {u.vId && <span className="text-[10px] opacity-70">{u.vId}</span>}
                    <button
                      onClick={() => removeUser(u.uid)}
                      className="ml-1 rounded-full hover:bg-black/20 p-0.5"
                      aria-label="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto space-y-1 rounded-md">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {searchQuery ? 'No users found.' : 'No users.'}
                </p>
              ) : (
                filteredUsers.map((u) => {
                  const selected = selectedUsers.some((s) => s.uid === u.uid);
                  return (
                    <button
                      key={u.uid}
                      onClick={() => toggleUser(u)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                        selected ? 'bg-blue-500/15 border border-blue-500/40' : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-semibold">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{u.name || 'Unnamed'}</span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {u.vId ? `${u.vId} · ` : ''}{u.email || u.uid.slice(0, 10) + '…'}
                        </span>
                      </span>
                      {selected && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected
            </p>
          </div>
        )}

        {!initialized && (
          <p className="text-xs text-orange-500">Initialize the Vee Team account first.</p>
        )}
      </Card>
    </div>
  );
}
