import { get, ref, update } from 'firebase/database';

import { rtdb } from '@/config/firebase';
import type { AppUser } from '@/types';

import { logModerationAction } from './moderationService';

function requireRtdb() {
  if (!rtdb) throw new Error('Firebase Realtime Database is not configured.');
  return rtdb;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read operations
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch every user from users/{uid}. Returns an array sorted by createdAt desc. */
export async function getAllUsers(): Promise<AppUser[]> {
  const database = requireRtdb();
  const snapshot = await get(ref(database, 'users'));

  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, any>;

  const defaults = {
    name: '',
    email: '',
    role: 'user' as const,
    diamonds: 0,
    wallet: 0,
    online: false,
    banned: false,
    createdAt: 0,
  };

  return Object.entries(raw).map(([uid, data]: any) => ({
    ...defaults,
    ...data,
    uid,
    role: (data.role ?? data.adminRole ?? 'user') as AppUser['role'],
  }));
}

/** Fetch a single user by UID from users/{uid}. */
export async function getUserById(uid: string): Promise<AppUser | null> {
  const database = requireRtdb();
  const snapshot = await get(ref(database, `users/${uid}`));

  if (!snapshot.exists()) return null;

  const data = snapshot.val();

  const defaults = {
    name: '',
    email: '',
    role: 'user' as const,
    diamonds: 0,
    wallet: 0,
    online: false,
    banned: false,
    createdAt: 0,
  };

  return {
    ...defaults,
    ...data,
    uid,
    role: (data.role ?? data.adminRole ?? 'user') as AppUser['role'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin write operations
// ─────────────────────────────────────────────────────────────────────────────

export async function banUser(
  uid: string,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();

  await update(ref(database, `users/${uid}`), {
    banned: true,
  });

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'ban',
    targetUid: uid,
    targetName,
    details: 'User banned by admin',
  });
}

export async function unbanUser(
  uid: string,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();

  await update(ref(database, `users/${uid}`), {
    banned: false,
  });

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'unban',
    targetUid: uid,
    targetName,
    details: 'User unbanned by admin',
  });
}

export async function changeUserRole(
  uid: string,
  newRole: string,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();

  await update(ref(database, `users/${uid}`), {
    role: newRole,
  });

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'change_role',
    targetUid: uid,
    targetName,
    details: `Role changed to: ${newRole}`,
  });
}

export async function addDiamonds(
  uid: string,
  amount: number,
  currentDiamonds: number,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();

  await update(ref(database, `users/${uid}`), {
    diamonds: currentDiamonds + amount,
  });

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'add_diamonds',
    targetUid: uid,
    targetName,
    details: `Added ${amount} diamonds (total: ${currentDiamonds + amount})`,
  });
}

export async function removeDiamonds(
  uid: string,
  amount: number,
  currentDiamonds: number,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();

  const snapshot = await get(ref(database, `users/${uid}/diamonds`));
  const current = Number(snapshot.val() ?? 0);
  const newTotal = Math.max(0, current - amount);

  await update(ref(database, `users/${uid}`), {
    diamonds: newTotal,
  });

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'remove_diamonds',
    targetUid: uid,
    targetName,
    details: `Removed ${amount} diamonds (total: ${newTotal})`,
  });
}