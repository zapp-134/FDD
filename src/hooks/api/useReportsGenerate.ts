import { useMutation } from "@tanstack/react-query";
import { getIngestionHistory, getChatResponse } from "../../lib/dataProvider";

export function useReportsGenerate() {
  return useMutation({ mutationFn: async (params?: unknown) => {
    // Placeholder: in absence of a real report generation endpoint, return ingestion history
    return getIngestionHistory();
  } });
}
