import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  assignLead,
  convertLeadToOpportunity,
  createLead,
  fetchLead,
  fetchLeads,
  updateLead,
} from "@/lib/api/crm";
import { queryKeys } from "@/lib/queryKeys";
import type { LeadCreateInput, LeadUpdateInput } from "@/types/crm";

export interface LeadListFilters {
  search?: string;
  status?: string;
  source?: string;
}

export function useLeads(filters: LeadListFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: ({ pageParam }) =>
      fetchLeads({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => fetchLead(id),
    enabled: Boolean(id),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadCreateInput) => createLead(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LeadUpdateInput) => updateLead(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.lead(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ownerId }: { id: string; ownerId: string }) =>
      assignLead(id, ownerId),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.lead(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}

export function useConvertLeadToOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => convertLeadToOpportunity(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.leads.all });
      void qc.invalidateQueries({ queryKey: queryKeys.opportunities.all });
    },
  });
}
