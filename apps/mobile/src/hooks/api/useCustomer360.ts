import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchCustomer360, fetchCustomer360Timeline } from "@/lib/api/revenue";
import { queryKeys } from "@/lib/queryKeys";

export function useCustomer360(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customer360(customerId),
    queryFn: () => fetchCustomer360(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCustomerTimeline(customerId: string, bucket = "all") {
  return useInfiniteQuery({
    queryKey: queryKeys.customerTimeline(customerId, bucket),
    queryFn: ({ pageParam }) =>
      fetchCustomer360Timeline(customerId, {
        limit: 30,
        cursor: pageParam ?? null,
        bucket: bucket === "all" ? undefined : bucket,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.meta.has_more ? last.meta.next_cursor : undefined,
  });
}
