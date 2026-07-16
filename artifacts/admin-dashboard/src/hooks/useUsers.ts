import { useMemo } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryClient } from '@/config/queryClient';
import { useAppAuth } from '@/contexts/AuthContext';
import {
  addDiamonds,
  banUser,
  changeUserRole,
  getAllUsers,
  removeDiamonds,
  unbanUser,
} from '@/services/userService';
import type {
  AppUser,
  PaginatedUsers,
  UseUsersOptions,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Base query — all users, cached
// ─────────────────────────────────────────────────────────────────────────────

/** Raw TanStack Query for all users. Cache key: ['users']. */
export function useAllUsers() {
  return useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: getAllUsers,
    staleTime: 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtered + paginated users — derived from useAllUsers, no extra fetch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns filtered, sorted, and paginated users.
 * All transformations happen client-side from the cached base query.
 *
 * @example
 * const { data, isLoading } = useUsers({ search: 'alice', filter: 'online', page: 1 });
 * // data.users — AppUser[] for the current page
 * // data.total — total matching users count
 * // data.pages — total page count
 */
export function useUsers(options: UseUsersOptions = {}) {
  const {
    search = '',
    filter = 'all',
    sort = 'newest',
    page = 1,
    pageSize = 50,
  } = options;

  const base = useAllUsers();

  const data = useMemo<PaginatedUsers>(() => {
    const allUsers = base.data ?? [];
    let result = [...allUsers];

    // ── Search ───────────────────────────────────────────────────────────────
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(q) ||
          u.vId?.toLowerCase().includes(q) ||
          u.uid.toLowerCase().includes(q) ||
          u.name?.toLowerCase().includes(q),
      );
    }

    // ── Filter ───────────────────────────────────────────────────────────────
    switch (filter) {
      case 'online':
        result = result.filter((u) => u.online);
        break;
      case 'offline':
        result = result.filter((u) => !u.online && !u.banned);
        break;
      case 'admin':
        result = result.filter(
          (u) => u.role === 'admin' || u.role === 'superAdmin',
        );
        break;
      case 'moderator':
        result = result.filter((u) => u.role === 'moderator');
        break;
      case 'user':
        result = result.filter((u) => u.role === 'user');
        break;
      case 'banned':
        result = result.filter((u) => u.banned);
        break;
    }

    // ── Sort ─────────────────────────────────────────────────────────────────
    switch (sort) {
      case 'newest':
        result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        break;
      case 'oldest':
        result.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        break;
      case 'diamonds':
        result.sort((a, b) => (b.diamonds ?? 0) - (a.diamonds ?? 0));
        break;
      case 'wallet':
        result.sort((a, b) => (b.wallet ?? 0) - (a.wallet ?? 0));
        break;
    }

    // ── Paginate ─────────────────────────────────────────────────────────────
    const total = result.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * pageSize;

    return {
      users: result.slice(start, start + pageSize),
      total,
      pages,
      currentPage: safePage,
    };
  }, [base.data, search, filter, sort, page, pageSize]);

  return { ...base, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation hooks — each invalidates ['users'] on success
// ─────────────────────────────────────────────────────────────────────────────

function invalidateUsers() {
  void queryClient.invalidateQueries({ queryKey: ['users'] });
  void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
}

export function useBanUser() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({ uid, targetName }: { uid: string; targetName: string }) => {
      if (!appUser) throw new Error('Not authenticated');
      return banUser(uid, appUser.uid, appUser.name, targetName);
    },
    onSuccess: () => { invalidateUsers(); toast.success('User banned'); },
    onError: () => toast.error('Failed to ban user'),
  });
}

export function useUnbanUser() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({ uid, targetName }: { uid: string; targetName: string }) => {
      if (!appUser) throw new Error('Not authenticated');
      return unbanUser(uid, appUser.uid, appUser.name, targetName);
    },
    onSuccess: () => { invalidateUsers(); toast.success('User unbanned'); },
    onError: () => toast.error('Failed to unban user'),
  });
}

export function useChangeRole() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      uid,
      newRole,
      targetName,
    }: {
      uid: string;
      newRole: string;
      targetName: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return changeUserRole(uid, newRole, appUser.uid, appUser.name, targetName);
    },
    onSuccess: () => { invalidateUsers(); toast.success('Role updated'); },
    onError: () => toast.error('Failed to change role'),
  });
}

export function useAddDiamonds() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      uid,
      amount,
      currentDiamonds,
      targetName,
    }: {
      uid: string;
      amount: number;
      currentDiamonds: number;
      targetName: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return addDiamonds(uid, amount, currentDiamonds, appUser.uid, appUser.name, targetName);
    },
    onSuccess: () => { invalidateUsers(); toast.success('Diamonds added'); },
    onError: () => toast.error('Failed to add diamonds'),
  });
}

export function useRemoveDiamonds() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      uid,
      amount,
      currentDiamonds,
      targetName,
    }: {
      uid: string;
      amount: number;
      currentDiamonds: number;
      targetName: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return removeDiamonds(uid, amount, currentDiamonds, appUser.uid, appUser.name, targetName);
    },
    onSuccess: () => { invalidateUsers(); toast.success('Diamonds removed'); },
    onError: () => toast.error('Failed to remove diamonds'),
  });
}
