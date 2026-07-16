import { useQuery } from '@tanstack/react-query';

import { getAllRooms } from '@/services/roomService';
import { getAllUsers } from '@/services/userService';
import type { DashboardStats } from '@/types';

/**
 * Fetches and computes dashboard overview statistics.
 * Data is considered stale after 2 minutes.
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [users, rooms] = await Promise.all([getAllUsers(), getAllRooms()]);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayTs = startOfToday.getTime();

      return {
        totalUsers: users.length,
        onlineUsers: users.filter((u) => u.online).length,
        bannedUsers: users.filter((u) => u.banned).length,
        newUsersToday: users.filter((u) => (u.createdAt ?? 0) >= todayTs).length,
        totalRooms: rooms.length,
        activeRooms: rooms.filter((r) => r.active).length,
      };
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
