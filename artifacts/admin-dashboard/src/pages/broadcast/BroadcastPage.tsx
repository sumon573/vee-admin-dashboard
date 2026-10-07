import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Send, Users, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const ONESIGNAL_APP_ID = '7bcaa8e5-f51a-4b57-ab3a-7600ea06709c';

async function sendBroadcast(title: string, message: string, target: string, uids?: string[]) {
  // Call the VPS API server which has the OneSignal REST API key
  const response = await fetch('https://vee-club.duckdns.org/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      message,
      target, // 'all' | 'segment' | 'users'
      ...(uids && { externalUserIds: uids }),
      appId: ONESIGNAL_APP_ID,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to send notification');
  }
  
  return response.json();
}

export default function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [uids, setUids] = useState('');
  
  const sendMutation = useMutation({
    mutationFn: () => {
      const uidList = target === 'users' 
        ? uids.split(',').map(u => u.trim()).filter(Boolean)
        : undefined;
      return sendBroadcast(title, message, target, uidList);
    },
    onSuccess: (data) => {
      toast.success(`Notification sent! Recipients: ${data.recipients || 'N/A'}`);
      setTitle('');
      setMessage('');
      setUids('');
    },
    onError: (error: Error) => toast.error(`Failed: ${error.message}`),
  });
  
  const isValid = title.trim() && message.trim() && (target !== 'users' || uids.trim());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" /> Push Broadcast
        </h1>
        <p className="text-muted-foreground mt-1">
          Send push notifications via OneSignal
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>
              App ID: <code className="text-xs">{ONESIGNAL_APP_ID}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/60</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message..."
                rows={4}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/200</p>
            </div>
            
            <div>
              <label className="text-sm font-medium">Target Audience</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2"><Users className="h-4 w-4" /> All Users</div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Active Users (7 days)</div>
                  </SelectItem>
                  <SelectItem value="users">
                    <div className="flex items-center gap-2"><User className="h-4 w-4" /> Specific Users</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {target === 'users' && (
              <div>
                <label className="text-sm font-medium">User UIDs (comma-separated)</label>
                <Textarea
                  value={uids}
                  onChange={(e) => setUids(e.target.value)}
                  placeholder="uid1, uid2, uid3..."
                  rows={3}
                />
              </div>
            )}
            
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={!isValid || sendMutation.isPending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? 'Sending...' : 'Send Notification'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{title || 'Notification Title'}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {message || 'Your notification message will appear here...'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Vee • now</div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Target:</span>
                <Badge>{target === 'all' ? 'All Users' : target === 'active' ? 'Active Users' : 'Specific Users'}</Badge>
              </div>
              {target === 'users' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Recipients:</span>
                  <Badge>{uids.split(',').filter(u => u.trim()).length} users</Badge>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Channel:</span>
                <Badge variant="outline">vee-messages</Badge>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs text-yellow-800">
                ⚠️ Broadcast notifications are sent immediately to all targeted devices. 
                Use carefully.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
