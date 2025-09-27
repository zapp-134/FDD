import { useMutation } from "@tanstack/react-query";
import { getIngestionHistory } from "../../lib/dataProvider";

// This hook triggers a fetch of ingestion history (upload endpoint should be implemented on the server).
export function useIngestUpload() {
  return useMutation({ mutationFn: async (payload: unknown) => {
    // if the server supports an upload endpoint this should call it; for now we refetch history
    await Promise.resolve();
    return getIngestionHistory();
  } });
}
