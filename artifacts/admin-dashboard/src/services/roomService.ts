import { get, ref, update } from 'firebase/database';

import { rtdb } from '@/config/firebase';
import type { Room } from '@/types';

import { logModerationAction } from './moderationService';

function requireRtdb() {
  if (!rtdb) throw new Error('Firebase Realtime Database is not configured.');
  return rtdb;
}

/** Fetch all rooms from rooms/{roomId}. */
export async function getAllRooms(): Promise<Room[]> {
  const database = requireRtdb();
  const snapshot = await get(ref(database, 'rooms'));
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, Omit<Room, 'id'>>;
  return Object.entries(raw).map(([id, data]) => ({ id, ...data }));
}

/** Fetch only active rooms. */
export async function getActiveRooms(): Promise<Room[]> {
  const all = await getAllRooms();
  return all.filter((r) => r.active);
}

/** Close a room by setting active = false. */
export async function closeRoom(
  roomId: string,
  moderatorUid: string,
  moderatorName: string,
  roomName: string,
): Promise<void> {
  const database = requireRtdb();
  await update(ref(database, `rooms/${roomId}`), { active: false });
  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'close_room',
    targetUid: roomId,
    targetName: roomName,
    details: `Room "${roomName}" closed by admin`,
  });
}

/** Remove a user from a room's members map. */
export async function kickUserFromRoom(
  roomId: string,
  uid: string,
  moderatorUid: string,
  moderatorName: string,
  targetName: string,
): Promise<void> {
  const database = requireRtdb();
  // Setting a key to null removes it from Firebase RTDB
  await update(ref(database, `rooms/${roomId}/members`), { [uid]: null });
  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'kick_from_room',
    targetUid: uid,
    targetName,
    details: `Kicked from room ${roomId}`,
  });
}

/** Lock a seat by index (prevents users from sitting). */
export async function lockSeat(
  roomId: string,
  seatIndex: number,
): Promise<void> {
  const database = requireRtdb();
  await update(ref(database, `rooms/${roomId}/seats/${seatIndex}`), {
    locked: true,
  });
}

/** Unlock a seat by index. */
export async function unlockSeat(
  roomId: string,
  seatIndex: number,
): Promise<void> {
  const database = requireRtdb();
  await update(ref(database, `rooms/${roomId}/seats/${seatIndex}`), {
    locked: false,
  });
}
