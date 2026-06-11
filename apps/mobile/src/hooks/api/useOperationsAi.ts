import { useQuery } from "@tanstack/react-query";
import { fetchOpsSnapshots, fetchOpsWidgets } from "@/lib/api/crm";

export function useOpsSnapshots(entityIds: string[]) {
  return useQuery({
    queryKey: ["ops-snapshots", entityIds],
    queryFn: () => fetchOpsSnapshots(entityIds),
    enabled: entityIds.length > 0,
    staleTime: 60_000,
  });
}

export function useOpsWidgets() {
  return useQuery({
    queryKey: ["ops-widgets"],
    queryFn: fetchOpsWidgets,
    staleTime: 60_000,
  });
}
