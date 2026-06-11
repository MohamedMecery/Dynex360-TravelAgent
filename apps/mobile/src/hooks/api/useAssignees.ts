import { useQuery } from "@tanstack/react-query";
import { fetchAssignees } from "@/lib/api/crm";
import { queryKeys } from "@/lib/queryKeys";

export function useAssignees(search?: string) {
  return useQuery({
    queryKey: queryKeys.assignees(search),
    queryFn: () => fetchAssignees(search),
    staleTime: 60_000,
  });
}
