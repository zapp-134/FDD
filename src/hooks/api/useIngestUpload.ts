import { useMutation } from "@tanstack/react-query";
import api from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export function useIngestUpload() {
  const toast = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);

      const res = await api.post('/ingest', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return res.data as { ingestId: string };
    },
    onError: () => {
      toast?.toast?.({
        title: 'Upload failed',
        description: 'Unable to upload file',
        variant: 'destructive',
      });
    },
  });
}
