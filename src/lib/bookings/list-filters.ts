import type { BookingStatus, PaymentStatus } from "@/types";

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  "draft",
  "confirmed",
  "completed",
  "cancelled",
];

export const PAYMENT_STATUSES: readonly PaymentStatus[] = ["unpaid", "partial", "paid"];

export interface BookingListFilters {
  status: BookingStatus | "";
  paymentStatus: PaymentStatus | "";
  customerId: string;
  reference: string;
  travelDateFrom: string;
  travelDateTo: string;
}

export const EMPTY_BOOKING_LIST_FILTERS: BookingListFilters = {
  status: "",
  paymentStatus: "",
  customerId: "",
  reference: "",
  travelDateFrom: "",
  travelDateTo: "",
};

export function parseBookingStatusParam(value: string | null): BookingStatus | "" {
  if (!value) return "";
  return BOOKING_STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : "";
}

export function parsePaymentStatusParam(value: string | null): PaymentStatus | "" {
  if (!value) return "";
  return PAYMENT_STATUSES.includes(value as PaymentStatus) ? (value as PaymentStatus) : "";
}

export function parseBookingListFilters(params: URLSearchParams): BookingListFilters {
  return {
    status: parseBookingStatusParam(params.get("status")),
    paymentStatus: parsePaymentStatusParam(params.get("payment")),
    customerId: params.get("customer") ?? "",
    reference: params.get("ref") ?? "",
    travelDateFrom: params.get("from") ?? "",
    travelDateTo: params.get("to") ?? "",
  };
}

export function bookingListFiltersToSearchParams(
  filters: BookingListFilters
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentStatus) params.set("payment", filters.paymentStatus);
  if (filters.customerId) params.set("customer", filters.customerId);
  if (filters.reference.trim()) params.set("ref", filters.reference.trim());
  if (filters.travelDateFrom) params.set("from", filters.travelDateFrom);
  if (filters.travelDateTo) params.set("to", filters.travelDateTo);
  return params;
}

export function hasActiveBookingListFilters(filters: BookingListFilters): boolean {
  return (
    Boolean(filters.status) ||
    Boolean(filters.paymentStatus) ||
    Boolean(filters.customerId) ||
    Boolean(filters.reference.trim()) ||
    Boolean(filters.travelDateFrom) ||
    Boolean(filters.travelDateTo)
  );
}
