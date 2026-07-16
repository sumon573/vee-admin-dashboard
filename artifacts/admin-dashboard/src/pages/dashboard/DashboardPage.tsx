import { useDashboardStats, useModerationLog } from '@/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users2,
  Wifi,
  Ban,
  UserPlus,
  Radio,
  Activity,
} from 'lucide-react';
import { formatNumber } from '@/utils';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: log, isLoading: logLoading } = useModerationLog();

  const cards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers,
      icon: Users2,
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: 'Online Now',
      value: stats?.onlineUsers,
      icon: Wifi,
      colorClass: 'text-green-500 bg-green-500/10',
    },
    {
      title: 'Banned Users',
      value: stats?.bannedUsers,
      icon: Ban,
      colorClass: 'text-red-500 bg-red-500/10',
    },
    {
      title: 'New Users Today',
      value: stats?.newUsersToday,
      icon: UserPlus,
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: 'Total Rooms',
      value: stats?.totalRooms,
      icon: Radio,
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: 'Active Rooms',
      value: stats?.activeRooms,
      icon: Activity,
      colorClass: 'text-green-500 bg-green-500/10',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Overview</h2>
        <p className="text-muted-foreground">Welcome to AdminPanel. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="bg-card hover-elevate transition-all border-border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-4 rounded-full ${card.colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <h3 className="text-3xl font-bold">{formatNumber(card.value || 0)}</h3>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold tracking-tight">Recent Moderation Activity</h3>
        <Card className="border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Moderator</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : log && log.length > 0 ? (
                log.slice(0, 5).map((entry) => (
                  <TableRow key={entry.id} className="border-border transition-colors">
                    <TableCell className="font-medium">{entry.moderatorName}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                        {entry.action}
                      </span>
                    </TableCell>
                    <TableCell>{entry.targetName}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {entry.timestamp ? format(new Date(entry.timestamp), 'MMM d, HH:mm') : 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No recent activity.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}