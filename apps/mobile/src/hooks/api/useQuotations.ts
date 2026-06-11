import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  acceptQuotation,
  addQuotationItem,
  approveQuotation,
  convertQuotation,
  createQuotation,
  deleteQuotationItem,
  fetchQuotation,
  fetchQuotations,
  markQuotationViewed,
  rejectQuotation,
  rejectQuotationApproval,
  sendQuotation,
  submitQuotationApproval,
  updateQuotation,
  updateQuotationItem,
} from "@/lib/api/revenue";
import { queryKeys } from "@/lib/queryKeys";
import type {
  QuotationCreateInput,
  QuotationItemInput,
  QuotationUpdateInput,
} from "@/types/revenue";

export interface QuotationListFilters {
  status?: string;
  search?: string;
  opportunity_id?: string;
  customer_id?: string;
}

export function useQuotations(filters: QuotationListFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.quotations.list(filters),
    queryFn: ({ pageParam }) =>
      fetchQuotations({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useQuotation(id: string) {
  return useQuery({
    queryKey: queryKeys.quotation(id),
    queryFn: () => fetchQuotation(id),
    enabled: Boolean(id),
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuotationCreateInput) => createQuotation(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

export function useUpdateQuotation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuotationUpdateInput) => updateQuotation(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.quotation(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

function useQuotationWorkflow(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.quotation(id) });
    void qc.invalidateQueries({ queryKey: queryKeys.quotations.all });
  };
  return {
    send: useMutation({ mutationFn: () => sendQuotation(id), onSuccess: invalidate }),
    accept: useMutation({ mutationFn: () => acceptQuotation(id), onSuccess: invalidate }),
    reject: useMutation({
      mutationFn: (reason?: string) => rejectQuotation(id, reason),
      onSuccess: invalidate,
    }),
    markViewed: useMutation({
      mutationFn: () => markQuotationViewed(id),
      onSuccess: invalidate,
    }),
    submitApproval: useMutation({
      mutationFn: () => submitQuotationApproval(id),
      onSuccess: invalidate,
    }),
    approve: useMutation({ mutationFn: () => approveQuotation(id), onSuccess: invalidate }),
    rejectApproval: useMutation({
      mutationFn: () => rejectQuotationApproval(id),
      onSuccess: invalidate,
    }),
    convert: useMutation({
      mutationFn: () => convertQuotation(id),
      onSuccess: invalidate,
    }),
  };
}

export { useQuotationWorkflow };

export function useQuotationItems(quotationId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.quotation(quotationId) });
  };
  return {
    add: useMutation({
      mutationFn: (input: QuotationItemInput) => addQuotationItem(quotationId, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ itemId, input }: { itemId: string; input: Partial<QuotationItemInput> }) =>
        updateQuotationItem(quotationId, itemId, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (itemId: string) => deleteQuotationItem(quotationId, itemId),
      onSuccess: invalidate,
    }),
  };
}
