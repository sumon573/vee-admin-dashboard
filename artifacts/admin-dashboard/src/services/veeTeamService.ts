/**
 * Vee Team System Account Service (2026-10-17, Sumon)
 *
 * The official system notice account ('vee_team'). All notices, warnings and
 * announcements to users are sent from this ID via 1-to-1 chats. Users cannot
 * reply (the app hides the input for this account).
 *
 * Firebase rules allow senderId='vee_team' writes ONLY for admins
 * (this panel) and for the chat participant themselves (welcome message).
 */

import { get, ref, push, set, update } from 'firebase/database';

import { rtdb } from '@/config/firebase';
import { logModerationAction } from './moderationService';

export const VEE_TEAM_UID = 'vee_team';
export const VEE_TEAM_NAME = 'Vee Team';

function requireRtdb() {
  if (!rtdb) throw new Error('Firebase Realtime Database is not configured.');
  return rtdb;
}

function buildChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/** Check whether the Vee Team system account exists. */
export async function getVeeTeamStatus(): Promise<boolean> {
  const database = requireRtdb();
  const snap = await get(ref(database, `users/${VEE_TEAM_UID}`));
  return snap.exists();
}

/**
 * One-time initialization of the Vee Team system account:
 * users/vee_team with the official verified badge.
 */
export async function initializeVeeTeam(
  moderatorUid: string,
  moderatorName: string,
): Promise<void> {
  const database = requireRtdb();
  const now = Date.now();

  await update(ref(database, `users/${VEE_TEAM_UID}`), {
    name: VEE_TEAM_NAME,
    isSystemAccount: true,
    officialBadge: {
      grantedBy: moderatorName,
      grantedAt: now,
    },
    bio: 'Official Vee Team account. Important notices and announcements come from here. Replies are disabled.',
    createdAt: now,
    online: false,
  });

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'system',
    targetUid: VEE_TEAM_UID,
    targetName: VEE_TEAM_NAME,
    details: 'Vee Team system account initialized',
  });
}

/**
 * Send a system notice from Vee Team to a list of users.
 * Creates the 1-to-1 chat if needed. Returns the number of users reached.
 */
export async function sendSystemNotice(
  targetUids: string[],
  content: string,
  moderatorUid: string,
  moderatorName: string,
): Promise<{ sent: number; failed: number }> {
  const database = requireRtdb();
  let sent = 0;
  let failed = 0;

  for (const uid of targetUids) {
    try {
      if (!uid || uid === VEE_TEAM_UID) continue;
      const chatId = buildChatId(uid, VEE_TEAM_UID);

      // Ensure both chat entries exist.
      const myEntry = ref(database, `userChats/${uid}/${chatId}`);
      const teamEntry = ref(database, `userChats/${VEE_TEAM_UID}/${chatId}`);
      const [mySnap, teamSnap] = await Promise.all([get(myEntry), get(teamEntry)]);
      const now = Date.now();
      if (!mySnap.exists()) {
        await set(myEntry, {
          id: chatId,
          participantId: VEE_TEAM_UID,
          participantName: VEE_TEAM_NAME,
          lastMessage: '',
          lastMessageType: 'text',
          lastMessageTime: now,
          unreadCount: 0,
          isOnline: false,
          hasStory: false,
          storySeen: false,
          isPinned: false,
        });
      }
      if (!teamSnap.exists()) {
        await set(teamEntry, {
          id: chatId,
          participantId: uid,
          participantName: '',
          lastMessage: '',
          lastMessageType: 'text',
          lastMessageTime: now,
          unreadCount: 0,
          isOnline: false,
          hasStory: false,
          storySeen: false,
          isPinned: false,
        });
      }

      // The notice itself, from Vee Team.
      const newMsgRef = push(ref(database, `chats/${chatId}/messages`));
      await set(newMsgRef, {
        chatId,
        senderId: VEE_TEAM_UID,
        senderName: VEE_TEAM_NAME,
        type: 'text',
        content,
        createdAt: now,
        status: 'sent',
        reactions: {},
        isSystemNotice: true,
        deletedForMe: false,
        deletedForEveryone: false,
      });

      // Update list metadata.
      const meta = {
        id: chatId,
        lastMessage: content.length > 80 ? content.slice(0, 80) + '…' : content,
        lastMessageType: 'text',
        lastMessageTime: now,
        isHidden: false,
      };
      const recipSnap = await get(myEntry);
      const prevUnread = (recipSnap.val()?.unreadCount as number) || 0;
      await Promise.all([
        update(myEntry, { ...meta, unreadCount: prevUnread + 1 }),
        update(teamEntry, { ...meta, unreadCount: 0 }),
      ]);

      sent++;
    } catch {
      failed++;
    }
  }

  await logModerationAction({
    moderatorUid,
    moderatorName,
    action: 'system-notice',
    targetUid: `${sent} users`,
    targetName: `${sent} users`,
    details: `System notice sent to ${sent} users (${failed} failed): ${content.slice(0, 100)}`,
  });

  return { sent, failed };
}
