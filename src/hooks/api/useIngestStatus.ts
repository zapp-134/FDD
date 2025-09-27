import { useQuery } from "@tanstack/react-query";
import { getIngestionHistory } from "../../lib/dataProvider";

export function useIngestStatus(id: string) {
  return useQuery({ queryKey: ["ingest", id], queryFn: async () => {
    const history = await getIngestionHistory();
    return history.find((h: any) => h.runId === id) ?? null;
  } });
}
