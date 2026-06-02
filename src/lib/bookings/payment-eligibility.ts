import type { BookingStatus } from "@/types";

export type PaymentEligibilityErrorCode = "cancelled" | "missing_booking";

export function canRecordPaymentForBookingStatus(
  status: BookingStatus
): boolean {
  return status !== "cancelled";
}

export function validatePaymentBookingEligibility(
  status: BookingStatus | undefined
): { ok: true } | { ok: false; code: PaymentEligibilityErrorCode } {
  if (!status) {
    return { ok: false, code: "missing_booking" };
  }
  if (!canRecordPaymentForBookingStatus(status)) {
    return { ok: false, code: "cancelled" };
  }
  return { ok: true };
}
