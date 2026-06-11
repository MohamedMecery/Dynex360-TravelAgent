import { useQuery } from "@tanstack/react-query";
import { fetchSalesSnapshots, fetchSalesWidgets } from "@/lib/api/crm";

export function useSalesSnapshots(
  entityType: "lead" | "opportunity",
  entityIds: string[]
) {
  return useQuery({
    queryKey: ["sales-snapshots", entityType, entityIds],
    queryFn: () => fetchSalesSnapshots(entityType, entityIds),
    enabled: entityIds.length > 0,
    staleTime: 60_000,
  });
}

export function useSalesWidgets() {
  return useQuery({
    queryKey: ["sales-widgets"],
    queryFn: fetchSalesWidgets,
    staleTime: 60_000,
  });
}
