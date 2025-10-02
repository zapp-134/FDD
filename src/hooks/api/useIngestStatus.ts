import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";

export function useIngestStatus(id: string) {
  return useQuery({
    queryKey: ["ingest", id],
    queryFn: async () => {
      const res = await api.get(`/ingest/${id}/status`);
      return res.data;
    },
    enabled: !!id,
  });
}
