import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import type { IngestResponse } from "@/types/api";

type Payload = { file: File; onProgress?: (p: number) => void; signal?: AbortSignal };

export function useIngestUpload() {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Payload) => {
      const form = new FormData();
      form.append('file', payload.file);

      const res = await api.post<IngestResponse>('/api/ingest', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e: ProgressEvent) => {
          if (payload.onProgress && e.total) {
            payload.onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
        signal: payload.signal,
      });

      return res.data;
    },
    onError: () => {
      toast?.toast?.({
        title: 'Upload failed',
        description: 'Unable to upload file',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ingestionHistory']);
    },
  });
}
