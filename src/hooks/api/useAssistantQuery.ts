import { useQuery } from "@tanstack/react-query";
import api from "@/lib/apiClient";

export function useAssistantQuery(prompt: string) {
  return useQuery({
    queryKey: ["assistant", prompt],
    queryFn: async () => {
      const res = await api.post('/assistant/query', { prompt });
      return res.data;
    },
    enabled: !!prompt,
  });
}
