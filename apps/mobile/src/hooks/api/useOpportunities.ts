import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createBookingFromOpportunity,
  createOpportunity,
  fetchOpportunities,
  fetchOpportunity,
  updateOpportunity,
} from "@/lib/api/crm";
import { queryKeys } from "@/lib/queryKeys";
import type {
  OpportunityCreateInput,
  OpportunityUpdateInput,
} from "@/types/crm";

export interface OpportunityListFilters {
  search?: string;
  stage?: string;
}

export function useOpportunities(filters: OpportunityListFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: ({ pageParam }) =>
      fetchOpportunities({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: queryKeys.opportunity(id),
    queryFn: () => fetchOpportunity(id),
    enabled: Boolean(id),
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpportunityCreateInput) => createOpportunity(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateOpportunity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OpportunityUpdateInput) => updateOpportunity(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.opportunity(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateBookingFromOpportunity(opportunityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      package_id?: string;
      notes?: string;
      line_items?: Array<{
        description: string;
        quantity: number;
        unit_price: number;
      }>;
    }) => createBookingFromOpportunity(opportunityId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.opportunity(opportunityId) });
    },
  });
}
