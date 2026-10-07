import { useQuery } from '@tanstack/react-query';
import { Activity, Users, Radio, Wifi, TrendingUp } from 'lucide-react';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb as database } from '@/config/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/utils';
import { format } from 'date-fns';

interface ActiveRoom {
  id: string;
  name?: string;
  hostUid?: string;
  hostName?: string;
  memberCount?: number;
  isLive?: boolean;
  createdAt?: number;
}

interface OnlineUser {
  uid: string;
  name?: string;
  lastSeen?: number;
  isOnline?: boolean;
}

async function getLiveStats() {
  try {
    const [roomsSnap, usersSnap] = await Promise.all([
      get(ref(database, 'voice_rooms')),
      get(ref(database, 'users')),
    ]);
    
    const activeRooms: ActiveRoom[] = [];
    let totalMembers = 0;
    
    if (roomsSnap.exists()) {
      roomsSnap.forEach((child) => {
        const room = child.val();
        if (room.isLive || (room.memberCount && room.memberCount > 0)) {
          activeRooms.push({ id: child.key!, ...room });
          totalMembers += room.memberCount || 0;
        }
      });
    }
    
    let onlineCount = 0;
    const recentUsers: OnlineUser[] = [];
    if (usersSnap.exists()) {
      const now = Date.now();
      usersSnap.forEach((child) => {
        const user = child.val();
        // Consider online if lastSeen within 5 minutes
        if (user.lastSeen && (now - user.lastSeen) < 5 * 60 * 1000) {
          onlineCount++;
          if (recentUsers.length < 20) {
            recentUsers.push({ uid: child.key!, ...user });
          }
        }
      });
    }
    
    return {
      activeRooms: activeRooms.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)),
      totalMembers,
      onlineCount,
      recentUsers,
    };
  } catch {
    return { activeRooms: [], totalMembers: 0, onlineCount: 0, recentUsers: [] };
  }
}

export default function MonitoringPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['live-stats'],
    queryFn: getLiveStats,
    refetchInterval: 30 * 1000, // Refresh every 30s
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" /> Live Monitoring
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time activity • Auto-refreshes every 30s
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" /> Online Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-3xl font-bold text-green-600">{formatNumber(data?.onlineCount || 0)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-purple-500" /> Active Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-3xl font-bold text-purple-600">{data?.activeRooms.length || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> In Voice Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-3xl font-bold text-blue-600">{formatNumber(data?.totalMembers || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" /> Active Voice Rooms
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : !data?.activeRooms.length ? (
            <p className="text-center text-muted-foreground py-8">No active rooms</p>
          ) : (
            <div className="space-y-2">
              {data.activeRooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{room.name || `Room ${room.id.substring(0, 8)}`}</div>
                    <div className="text-sm text-muted-foreground">
                      Host: {room.hostName || room.hostUid?.substring(0, 8) || 'Unknown'}
                      {room.createdAt && <span className="ml-2">• {format(new Date(room.createdAt), 'HH:mm')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      <Users className="h-3 w-3 mr-1" /> {room.memberCount || 0}
                    </Badge>
                    {room.isLive && <Badge className="bg-red-100 text-red-800 animate-pulse">LIVE</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Recently Online
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data?.recentUsers.map((user) => (
                <Badge key={user.uid} variant="outline" className="py-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  {user.name || user.uid.substring(0, 8)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
