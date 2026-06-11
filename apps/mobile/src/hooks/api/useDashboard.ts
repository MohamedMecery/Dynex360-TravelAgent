import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "@/lib/api/crm";
import { queryKeys } from "@/lib/queryKeys";

export function useDashboard(period: "month" | "quarter" = "month") {
  return useQuery({
    queryKey: queryKeys.dashboard(period),
    queryFn: () => fetchDashboard(period),
  });
}
