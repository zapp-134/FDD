import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';

import type { ReportStatus } from '@/types/api';

export default function useReportStatus(reportId?: string) {
  return useQuery<ReportStatus>({
    queryKey: ['reportStatus', reportId],
    queryFn: async () => {
      const res = await api.get<ReportStatus>(`/api/reports/${reportId}/status`);
      return res.data;
    },
    enabled: !!reportId,
    refetchInterval: 2000,
  });
}
