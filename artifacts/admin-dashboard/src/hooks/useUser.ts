import { useQuery } from '@tanstack/react-query';

import { getUserById } from '@/services/userService';
import type { AppUser } from '@/types';

/**
 * Fetch a single user profile by UID.
 * Cache key: ['user', uid]
 *
 * @example
 * const { data: user, isLoading } = useUser(uid);
 */
export function useUser(uid: string | undefined) {
  return useQuery<AppUser | null>({
    queryKey: ['user', uid],
    queryFn: () => getUserById(uid!),
    enabled: Boolean(uid),
    staleTime: 60 * 1000,
  });
}
