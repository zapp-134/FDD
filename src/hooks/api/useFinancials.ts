import { useQuery } from "@tanstack/react-query";
import { getFinancials } from "../../lib/dataProvider";

export function useFinancials() {
  return useQuery({ queryKey: ["financials"], queryFn: () => getFinancials() });
}
