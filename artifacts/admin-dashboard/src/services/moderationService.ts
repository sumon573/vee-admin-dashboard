import { get, push, ref } from 'firebase/database';

import { rtdb } from '@/config/firebase';
import type { ModerationLogEntry } from '@/types';

function requireRtdb() {
  if (!rtdb) throw new Error('Firebase Realtime Database is not configured.');
  return rtdb;
}

type LogInput = Omit<ModerationLogEntry, 'id' | 'timestamp'>;

/** Write a new moderation action entry to moderationLog. */
export async function logModerationAction(entry: LogInput): Promise<void> {
  const database = requireRtdb();
  await push(ref(database, 'moderationLog'), {
    ...entry,
    timestamp: Date.now(),
  });
}

/** Fetch all moderation log entries, sorted newest first. */
export async function getModerationLog(): Promise<ModerationLogEntry[]> {
  const database = requireRtdb();
  const snapshot = await get(ref(database, 'moderationLog'));
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<
    string,
    Omit<ModerationLogEntry, 'id'>
  >;
  return Object.entries(raw)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.timestamp - a.timestamp);
}
