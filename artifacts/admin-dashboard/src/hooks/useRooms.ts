import { useMemo } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryClient } from '@/config/queryClient';
import { useAppAuth } from '@/contexts/AuthContext';
import {
  closeRoom,
  getAllRooms,
  kickUserFromRoom,
  lockSeat,
  unlockSeat,
} from '@/services/roomService';
import type { Room } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all rooms. Refreshes every 30 seconds for near-real-time feel. */
export function useAllRooms() {
  return useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: getAllRooms,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/** Derived hook — returns only active rooms. No additional fetch. */
export function useActiveRooms() {
  const base = useAllRooms();
  const activeRooms = useMemo(
    () => (base.data ?? []).filter((r) => r.active),
    [base.data],
  );
  return { ...base, data: activeRooms };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

function invalidateRooms() {
  void queryClient.invalidateQueries({ queryKey: ['rooms'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
}

export function useCloseRoom() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      roomId,
      roomName,
    }: {
      roomId: string;
      roomName: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return closeRoom(roomId, appUser.uid, appUser.name, roomName);
    },
    onSuccess: () => { invalidateRooms(); toast.success('Room closed'); },
    onError: () => toast.error('Failed to close room'),
  });
}

export function useKickUser() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      roomId,
      uid,
      targetName,
    }: {
      roomId: string;
      uid: string;
      targetName: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return kickUserFromRoom(roomId, uid, appUser.uid, appUser.name, targetName);
    },
    onSuccess: () => { invalidateRooms(); toast.success('User kicked from room'); },
    onError: () => toast.error('Failed to kick user'),
  });
}

export function useLockSeat() {
  return useMutation({
    mutationFn: ({
      roomId,
      seatIndex,
    }: {
      roomId: string;
      seatIndex: number;
    }) => lockSeat(roomId, seatIndex),
    onSuccess: () => { invalidateRooms(); toast.success('Seat locked'); },
    onError: () => toast.error('Failed to lock seat'),
  });
}

export function useUnlockSeat() {
  return useMutation({
    mutationFn: ({
      roomId,
      seatIndex,
    }: {
      roomId: string;
      seatIndex: number;
    }) => unlockSeat(roomId, seatIndex),
    onSuccess: () => { invalidateRooms(); toast.success('Seat unlocked'); },
    onError: () => toast.error('Failed to unlock seat'),
  });
}
