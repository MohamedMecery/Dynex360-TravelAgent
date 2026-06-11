import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createActivity,
  fetchActivities,
  fetchActivity,
  updateActivity,
} from "@/lib/api/crm";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ActivityCreateInput,
  ActivityListView,
  ActivityUpdateInput,
  CrmActivity,
} from "@/types/crm";

export type ActivityFilterTab = "open" | "completed" | "overdue";

function viewForTab(tab: ActivityFilterTab): ActivityListView {
  if (tab === "open") return "upcoming";
  if (tab === "overdue") return "overdue";
  return "timeline";
}

export function useActivities(tab: ActivityFilterTab) {
  const view = viewForTab(tab);
  return useInfiniteQuery({
    queryKey: queryKeys.activities.list({ view, tab }),
    queryFn: async ({ pageParam }) => {
      const result = await fetchActivities({
        view,
        page: pageParam,
        limit: 20,
      });
      if (tab === "completed") {
        const filtered = result.data.filter(
          (a) => a.status === "completed" || a.status === "cancelled"
        );
        return { ...result, data: filtered };
      }
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => fetchActivity(id),
    enabled: Boolean(id),
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityCreateInput) => createActivity(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.activities.all });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateActivity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityUpdateInput) => updateActivity(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.activity(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.activities.all });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCompleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (activity: CrmActivity) =>
      updateActivity(activity.id, { status: "completed" }),
    onSuccess: (_d, activity) => {
      void qc.invalidateQueries({ queryKey: queryKeys.activity(activity.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.activities.all });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
