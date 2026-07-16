import { get, ref, update } from 'firebase/database';

import { rtdb } from '@/config/firebase';
import type { Report, ReportStatus } from '@/types';

function requireRtdb() {
  if (!rtdb) throw new Error('Firebase Realtime Database is not configured.');
  return rtdb;
}

/** Fetch all reports from reports/{reportId}. */
export async function getAllReports(): Promise<Report[]> {
  const database = requireRtdb();
  const snapshot = await get(ref(database, 'reports'));
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, Omit<Report, 'id'>>;
  return Object.entries(raw).map(([id, data]) => ({ id, ...data }));
}

/** Fetch reports filtered by status. */
export async function getReportsByStatus(
  status: ReportStatus,
): Promise<Report[]> {
  const all = await getAllReports();
  return all.filter((r) => r.status === status);
}

/** Mark a report as resolved and attach a moderator note. */
export async function resolveReport(
  reportId: string,
  note: string,
  moderatorUid: string,
): Promise<void> {
  const database = requireRtdb();
  await update(ref(database, `reports/${reportId}`), {
    status: 'resolved' as ReportStatus,
    moderatorNote: note,
    resolvedBy: moderatorUid,
    resolvedAt: Date.now(),
  });
}

/** Mark a report as dismissed and attach a moderator note. */
export async function dismissReport(
  reportId: string,
  note: string,
  moderatorUid: string,
): Promise<void> {
  const database = requireRtdb();
  await update(ref(database, `reports/${reportId}`), {
    status: 'dismissed' as ReportStatus,
    moderatorNote: note,
    resolvedBy: moderatorUid,
    resolvedAt: Date.now(),
  });
}
