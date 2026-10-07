import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search, ShieldCheck, UserX, Award, Wallet, Bell } from 'lucide-react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  action: string;
  adminUid?: string;
  adminName?: string;
  targetUid?: string;
  details?: string;
  timestamp: number;
}

async function getAuditLogs(limit = 100): Promise<AuditEntry[]> {
  try {
    const auditRef = query(
      ref(database, 'admin_audit'),
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    const snapshot = await get(auditRef);
    if (!snapshot.exists()) return [];
    
    const logs: AuditEntry[] = [];
    snapshot.forEach((child) => {
      logs.push({ id: child.key!, ...child.val() });
    });
    return logs.reverse();
  } catch {
    return [];
  }
}

const actionConfig: Record<string, { icon: any; color: string; label: string }> = {
  ban_user: { icon: UserX, color: 'bg-red-100 text-red-800', label: 'Ban User' },
  unban_user: { icon: ShieldCheck, color: 'bg-green-100 text-green-800', label: 'Unban User' },
  grant_honor: { icon: Award, color: 'bg-purple-100 text-purple-800', label: 'Grant Honor' },
  revoke_honor: { icon: Award, color: 'bg-gray-100 text-gray-800', label: 'Revoke Honor' },
  add_diamonds: { icon: Wallet, color: 'bg-yellow-100 text-yellow-800', label: 'Add Diamonds' },
  remove_diamonds: { icon: Wallet, color: 'bg-orange-100 text-orange-800', label: 'Remove Diamonds' },
  send_broadcast: { icon: Bell, color: 'bg-blue-100 text-blue-800', label: 'Send Broadcast' },
};

export default function AuditPage() {
  const [search, setSearch] = useState('');
  
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => getAuditLogs(100),
    staleTime: 30 * 1000,
  });
  
  const filtered = (logs || []).filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(s) ||
      log.targetUid?.toLowerCase().includes(s) ||
      log.adminName?.toLowerCase().includes(s) ||
      log.details?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ScrollText className="h-8 w-8" /> Audit Logs
        </h1>
        <p className="text-muted-foreground mt-1">Track all admin actions</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, UID, or admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No audit logs found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((log) => {
                const config = actionConfig[log.action] || { icon: ScrollText, color: 'bg-gray-100 text-gray-800', label: log.action };
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.adminName && <span>By {log.adminName} • </span>}
                          {log.targetUid && <span>Target: {log.targetUid.substring(0, 12)}... • </span>}
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                        {log.details && <div className="text-xs text-muted-foreground mt-1">{log.details}</div>}
                      </div>
                    </div>
                    <Badge className={config.color}>{log.action}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
