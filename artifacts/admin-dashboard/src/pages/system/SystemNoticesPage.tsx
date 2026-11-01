import { useState, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, CheckCircle2, AlertTriangle, Search, X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

import { useAppAuth } from '@/contexts/AuthContext';
import { getVeeTeamStatus, initializeVeeTeam, sendSystemNotice } from '@/services/veeTeamService';
import { getAllUsers } from '@/services/userService';
import { auth } from '@/config/firebase';
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

// 2026-11-01 (batch62): notification-sized preview of a banner.
// Android's notification-image download (expo-notifications DownloadImage)
// times out at 8s connect + 8s read. A 1.7 MB banner needs ~8s+ on a
// 200 K/S connection and far longer on slower ones, so the shade falls back
// to text-only. Telegram's behavior, mirrored here: the push carries a small
// fast preview; tapping opens the full original in chat.
// The preview keeps the FULL image (aspect preserved, never cropped):
// long side capped at 1200px, JPEG, shrinking until <= 100KB.
// 100KB is the largest size that still fits the 1-2 second window on a slow
// connection: ~0.5s at 200 K/S and ~2s at 50 K/S, so the notification
// arrives within 1-2 seconds, complete with image. The mechanism is the
// OS's own download-then-show path — Android fetches notification.image in
// the background and only then presents the notification — so there is no
// new prefetch architecture and no app-side delayed presentation here.
// Throws on any generation failure — callers fall back to the original URL.
async function buildNotificationPreview(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Preview: banner could not be decoded'));
      el.src = objectUrl;
    });
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) throw new Error('Preview: banner has no dimensions');
    const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Preview: canvas encode failed'))),
          'image/jpeg',
          quality,
        );
      });
    const render = (maxDim: number): HTMLCanvasElement => {
      const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
      const w = Math.max(1, Math.round(naturalW * scale));
      const h = Math.max(1, Math.round(naturalH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Preview: no 2d canvas context');
      // JPEG has no alpha — paint white behind transparent banners so the
      // preview never renders as black.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return canvas;
    };
    const BUDGET = 100 * 1024;
    let maxDim = 1200;
    let quality = 0.8;
    let blob = await toBlob(render(maxDim), quality);
    // Shrink until under budget: quality steps first, then dimensions.
    // Bounded (<= 8 attempts); the smallest attempt is returned even if
    // still over budget — still far smaller than the original.
    for (let attempt = 0; attempt < 8 && blob.size > BUDGET; attempt++) {
      if (quality > 0.5) {
        quality = Math.max(0.5, +(quality - 0.1).toFixed(2));
      } else {
        maxDim = Math.max(320, Math.round(maxDim * 0.75));
        quality = 0.7;
      }
      blob = await toBlob(render(maxDim), quality);
    }
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function SystemNoticesPage() {
  const { appUser } = useAppAuth();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'users'>('all');
  // 2026-10-17 (Sumon): Specific users — searchable picker with DP + name + V ID.
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  // 2026-10-18 (Sumon): banner image for official notices — uploaded to
  // Telegram storage, shown in push notification + Vee Team chat.
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // 2026-11-01 (batch57): one ID token for banner upload AND the rich
      // push (best-effort — a missing token only skips push, never the notice).
      let idToken: string | undefined;
      try {
        idToken = await auth?.currentUser?.getIdToken();
      } catch {
        idToken = undefined;
      }
      // 2026-10-18 (Sumon): upload banner to Telegram storage first.
      let bannerUrl: string | undefined;
      if (bannerFile) {
        if (!idToken) throw new Error('Not authenticated — cannot upload banner');
        const form = new FormData();
        form.append('file', bannerFile, bannerFile.name || 'banner.jpg');
        form.append('type', 'chat');
        // 2026-11-01 (batch61): notification banners keep the FULL-RESOLUTION ORIGINAL (Telegram level) — media server stores original=1 uploads as documents, never re-encoded.
        form.append('original', '1');
        const resp = await fetch('https://vee-club.duckdns.org/api/media/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
          body: form,
        });
        if (!resp.ok) throw new Error('Banner upload failed');
        const data = await resp.json();
        bannerUrl = data.url;
        if (!bannerUrl) throw new Error('Banner upload returned no URL');
      }
      // 2026-11-01 (batch62): small fast preview for the PUSH ONLY.
      // The DM keeps the full original (bannerUrl). Preview upload uses the
      // regular path (NOT original=1 — the preview is meant to be small).
      // The preview upload completes BEFORE sendSystemNotice, so no push
      // ever references a preview URL that does not exist yet.
      // Any preview failure falls back to the original URL for the push
      // (never worse than today) and NEVER fails the notice.
      let pushImageUrl: string | undefined;
      if (bannerFile && bannerUrl && idToken) {
        try {
          const previewBlob = await buildNotificationPreview(bannerFile);
          const previewForm = new FormData();
          previewForm.append('file', previewBlob, 'notice-preview.jpg');
          previewForm.append('type', 'chat');
          const previewResp = await fetch('https://vee-club.duckdns.org/api/media/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
            body: previewForm,
          });
          if (!previewResp.ok) throw new Error('Preview upload failed');
          const previewData = await previewResp.json();
          if (previewData.url) pushImageUrl = previewData.url;
        } catch {
          pushImageUrl = undefined;
        }
      }
      return sendSystemNotice(targets, text, appUser.uid, appUser.name, bannerUrl, { idToken, pushImageUrl });
    },
    onSuccess: (res) => {
      toast.success(`Notice sent to ${res.sent} users${res.failed ? ` (${res.failed} failed)` : ''}${res.pushFailed ? ` (push failed for ${res.pushFailed})` : ''}`);
      setMessage('');
      setSelectedUsers([]);
      setSearchQuery('');
      setBannerFile(null);
      setBannerPreview(null);
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
        {/* 2026-10-18 (Sumon): banner image — shown in push notification + chat */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setBannerFile(f);
                setBannerPreview(URL.createObjectURL(f));
              }
            }}
          />
          {bannerPreview ? (
            <div className="relative inline-block">
              <img src={bannerPreview} alt="Banner preview" className="max-h-40 rounded-lg border" />
              <button
                type="button"
                onClick={() => { setBannerFile(null); setBannerPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                title="Remove banner"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-muted-foreground mt-1">Banner — will show in notification + chat</p>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              Add Banner Image (optional)
            </Button>
          )}
        </div>
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
