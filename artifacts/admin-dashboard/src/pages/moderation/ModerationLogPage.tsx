import { useModerationLog } from '@/hooks';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ACTION_LABELS: Record<string, string> = {
  ban: 'Banned User',
  unban: 'Unbanned User',
  change_role: 'Changed Role',
  add_diamonds: 'Added Diamonds',
  remove_diamonds: 'Removed Diamonds',
  close_room: 'Closed Room',
  kick_from_room: 'Kicked from Room',
};

const ACTION_COLORS: Record<string, string> = {
  ban: 'bg-red-500/20 text-red-500 border-red-500/30',
  unban: 'bg-green-500/20 text-green-500 border-green-500/30',
  change_role: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  add_diamonds: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  remove_diamonds: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  close_room: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  kick_from_room: 'bg-red-500/20 text-red-500 border-red-500/30',
};

export default function ModerationLogPage() {
  const { data: log, isLoading } = useModerationLog();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Moderation Log</h2>
        <p className="text-muted-foreground">Audit trail of all administrative actions</p>
      </div>

      <Card className="border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Moderator</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : log && log.length > 0 ? (
              log.map((entry) => (
                <TableRow key={entry.id} className="border-border transition-colors">
                  <TableCell className="font-medium">{entry.moderatorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ACTION_COLORS[entry.action] || 'bg-secondary text-secondary-foreground'}>
                      {ACTION_LABELS[entry.action] || entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.targetName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {entry.details || '-'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                    {entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm') : 'Unknown'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ScrollText className="w-8 h-8 opacity-20" />
                    <p>No moderation actions yet</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}