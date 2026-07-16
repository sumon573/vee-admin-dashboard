import { useQuery } from '@tanstack/react-query';

import { getModerationLog } from '@/services/moderationService';
import type { ModerationLogEntry } from '@/types';

/**
 * Fetch all moderation log entries, sorted newest first.
 * Cache key: ['moderation-log']
 */
export function useModerationLog() {
  return useQuery<ModerationLogEntry[]>({
    queryKey: ['moderation-log'],
    queryFn: getModerationLog,
    staleTime: 60 * 1000,
  });
}
