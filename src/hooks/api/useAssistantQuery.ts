import { useQuery } from "@tanstack/react-query";
import { getChatResponse } from "../../lib/dataProvider";

export function useAssistantQuery(prompt: string) {
  return useQuery({ queryKey: ["assistant", prompt], queryFn: () => getChatResponse(prompt), enabled: !!prompt });
}
