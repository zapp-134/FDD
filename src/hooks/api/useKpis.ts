import { useQuery } from "@tanstack/react-query";
import { getKpis } from "../../lib/dataProvider";

export function useKpis() {
  return useQuery({ queryKey: ["kpis"], queryFn: () => getKpis() });
}

