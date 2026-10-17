import { get, ref, remove, update } from 'firebase/database';

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

/**
 * Resolve a vId (e.g. "v7809825") to the user's UID.
 * Returns null if not found.
 */
export async function getUidByVId(vId: string): Promise<string | null> {
  const database = requireRtdb();
  const { query, orderByChild, equalTo } = await import('firebase/database');
  const q = query(ref(database, 'users'), orderByChild('vId'), equalTo(vId.trim()));
  const snapshot = await get(q);
  if (!snapshot.exists()) return null;
  // Return the first matching UID
  let uid: string | null = null;
  snapshot.forEach((child) => {
    if (!uid) uid = child.key;
  });
  return uid;
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

// ─────────────────────────────────────────────────────────────────────────────
// Voice-room ban (2026-10-17, Sumon): bans ONLY voice-room access — the user
// can still log in and use the rest of the app. Controlled from this panel.
// ─────────────────────────────────────────────────────────────────────────────

export type VoiceBanDuration =
  | { kind: 'temporary'; ms: number }
  | { kind: 'permanent' };

export async function banUserFromVoice(
  uid: string,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
  reason: string,
  duration: VoiceBanDuration,
): Promise<void> {
  const database = requireRtdb();
  const now = Date.now();
  const bannedUntil = duration.kind === 'permanent' ? null : now + duration.ms;

  const banRecord = {
    banned: true,
    reason,
    bannedAt: now,
    bannedUntil,
    bannedBy: moderatorName,
  };

  await update(ref(database, `users/${uid}`), { voiceBan: banRecord });

  // History (never deleted — shows escalation for repeat offenders).
  await update(ref(database, `users/${uid}/banHistory`), {
    [`voice_${now}`]: { ...banRecord, type: 'voice' },
  });

  // 2026-10-17 (Sumon): auto-send a warning notice from Vee Team.
  try {
    const { sendSystemNotice } = await import('./veeTeamService');
    const untilText = bannedUntil
      ? ` until ${new Date(bannedUntil).toLocaleString()}`
      : ' permanently';
    await sendSystemNotice(
      [uid],
      `⚠️ Voice Room Restriction\n\nYour access to voice rooms has been restricted${untilText}.\n\nReason: ${reason}\n\nPlease follow the community rules. Repeated violations lead to longer restrictions.`,
      moderatorUid,
      moderatorName,
    );
  } catch {
    // Non-critical — the ban itself succeeded; the notice is best-effort.
  }

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'voice-ban',
    targetUid: uid,
    targetName,
    details: `Voice-room banned (${reason}, ${duration.kind === 'permanent' ? 'permanent' : `until ${new Date(bannedUntil as number).toLocaleString()}`})`,
  });
}

export async function unbanUserFromVoice(
  uid: string,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();

  await remove(ref(database, `users/${uid}/voiceBan`));

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'voice-unban',
    targetUid: uid,
    targetName,
    details: 'Voice-room ban lifted by admin',
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

  const newTotal = currentDiamonds + amount;
  // 2026-10-13: App reads from wallets/{uid}/balance (real-time) — write there.
  // Also keep users/{uid}/diamonds in sync (legacy field).
  // Atomic multi-path update — দুটো একসাথে succeed/fail হবে (partial failure নয়)।
  const updates: Record<string, number> = {};
  updates[`users/${uid}/diamonds`] = newTotal;
  updates[`wallets/${uid}/balance`] = newTotal;
  await update(ref(database), updates);

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'add_diamonds',
    targetUid: uid,
    targetName,
    details: `Added ${amount} diamonds (total: ${newTotal})`,
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

  // 2026-10-13: App reads from wallets/{uid}/balance (real-time) — write there.
  // Also keep users/{uid}/diamonds in sync (legacy field).
  // Atomic multi-path update — দুটো একসাথে succeed/fail হবে (partial failure নয়)।
  const updates: Record<string, number> = {};
  updates[`users/${uid}/diamonds`] = newTotal;
  updates[`wallets/${uid}/balance`] = newTotal;
  await update(ref(database), updates);

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'remove_diamonds',
    targetUid: uid,
    targetName,
    details: `Removed ${amount} diamonds (total: ${newTotal})`,
  });
}