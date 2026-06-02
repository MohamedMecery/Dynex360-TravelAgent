import type { BookingStatus } from "@/types";

/** BR-008: draft → confirmed → completed; draft|confirmed → cancelled */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const TERMINAL_STATUSES: readonly BookingStatus[] = ["completed", "cancelled"];

export function canTransitionBookingStatus(
  from: BookingStatus,
  to: BookingStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canCancelBooking(status: BookingStatus): boolean {
  return status === "draft" || status === "confirmed";
}

export function canConfirmBooking(status: BookingStatus): boolean {
  return status === "draft";
}

export function canCompleteBooking(status: BookingStatus): boolean {
  return status === "confirmed";
}

export function getAllowedBookingTransitions(
  from: BookingStatus
): readonly BookingStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export type BookingTransitionErrorCode =
  | "same_status"
  | "terminal_status"
  | "invalid_transition";

export function validateBookingStatusTransition(
  from: BookingStatus,
  to: BookingStatus
): { ok: true } | { ok: false; code: BookingTransitionErrorCode } {
  if (from === to) {
    return { ok: false, code: "same_status" };
  }
  if (isTerminalBookingStatus(from)) {
    return { ok: false, code: "terminal_status" };
  }
  if (!canTransitionBookingStatus(from, to)) {
    return { ok: false, code: "invalid_transition" };
  }
  return { ok: true };
}
