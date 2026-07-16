import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryClient } from '@/config/queryClient';
import { useAppAuth } from '@/contexts/AuthContext';
import {
  dismissReport,
  getAllReports,
  resolveReport,
} from '@/services/reportService';
import type { Report, ReportStatus } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all reports, optionally filtered by status.
 *
 * @example
 * const { data: reports } = useReports('pending');
 */
export function useReports(status?: ReportStatus) {
  return useQuery<Report[]>({
    queryKey: ['reports', status ?? 'all'],
    queryFn: async () => {
      const all = await getAllReports();
      if (!status) return all;
      return all.filter((r) => r.status === status);
    },
    staleTime: 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

function invalidateReports() {
  void queryClient.invalidateQueries({ queryKey: ['reports'] });
}

export function useResolveReport() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      reportId,
      note,
    }: {
      reportId: string;
      note: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return resolveReport(reportId, note, appUser.uid);
    },
    onSuccess: () => { invalidateReports(); toast.success('Report resolved'); },
    onError: () => toast.error('Failed to resolve report'),
  });
}

export function useDismissReport() {
  const { appUser } = useAppAuth();
  return useMutation({
    mutationFn: ({
      reportId,
      note,
    }: {
      reportId: string;
      note: string;
    }) => {
      if (!appUser) throw new Error('Not authenticated');
      return dismissReport(reportId, note, appUser.uid);
    },
    onSuccess: () => { invalidateReports(); toast.success('Report dismissed'); },
    onError: () => toast.error('Failed to dismiss report'),
  });
}
