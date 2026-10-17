import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useAppAuth } from '@/contexts/AuthContext';
import { getVeeTeamStatus, initializeVeeTeam, sendSystemNotice } from '@/services/veeTeamService';
import { getAllUsers } from '@/services/userService';
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
  const [uids, setUids] = useState('');

  const { data: initialized, isLoading: statusLoading } = useQuery({
    queryKey: ['vee-team-status'],
    queryFn: getVeeTeamStatus,
  });

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
        targets = uids.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (targets.length === 0) throw new Error('No recipients');
      return sendSystemNotice(targets, text, appUser.uid, appUser.name);
    },
    onSuccess: (res) => {
      toast.success(`Notice sent to ${res.sent} users${res.failed ? ` (${res.failed} failed)` : ''}`);
      setMessage('');
      setUids('');
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
          {target === 'users' && (
            <Input
              value={uids}
              onChange={(e) => setUids(e.target.value)}
              placeholder="Comma-separated user UIDs"
              className="flex-1"
            />
          )}
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !message.trim() || !initialized}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? 'Sending…' : 'Send as Vee Team'}
          </Button>
        </div>
        {!initialized && (
          <p className="text-xs text-orange-500">Initialize the Vee Team account first.</p>
        )}
      </Card>
    </div>
  );
}
