import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchBooking, fetchBookings, updateBookingStatus } from "@/lib/api/revenue";
import { queryKeys } from "@/lib/queryKeys";
import type { BookingStatus } from "@/types/revenue";

export interface BookingListFilters {
  status?: string;
  search?: string;
}

export function useBookings(filters: BookingListFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.bookings.list(filters),
    queryFn: ({ pageParam }) =>
      fetchBookings({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: () => fetchBooking(id),
    enabled: Boolean(id),
  });
}

export function useUpdateBookingStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: BookingStatus) => updateBookingStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.booking(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}
