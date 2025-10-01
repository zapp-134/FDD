import { useMutation } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export function useReportsGenerate() {
  const toast = useToast();

  return useMutation({
    mutationFn: async (payload?: unknown) => {
      // kick off report generation
      const res = await api.post('/reports/generate', payload ?? {});
      return res.data as { reportId?: string };
    },
    onError: () => {
      toast?.toast?.({
        title: 'Report generation failed',
        description: 'Unable to generate report',
        variant: 'destructive',
      });
    },
  });
}
