import type { QuotationApprovalMode, QuotationStatus } from "@/types";

export class QuotationTransitionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const EDITABLE_QUOTATION_STATUSES: QuotationStatus[] = [
  "draft",
  "pending_approval",
];

export function isQuotationExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return validUntil < today;
}

export function assertTransition(
  from: QuotationStatus,
  to: QuotationStatus,
  mode: QuotationApprovalMode
): void {
  const allowed = getAllowedTransitions(from, mode);
  if (!allowed.includes(to)) {
    throw new QuotationTransitionError(
      "QUOTATION_TRANSITION_INVALID",
      `Cannot transition from ${from} to ${to}`
    );
  }
}

export function getAllowedTransitions(
  from: QuotationStatus,
  mode: QuotationApprovalMode
): QuotationStatus[] {
  if (from === "converted_to_booking" || from === "rejected" || from === "expired") {
    return [];
  }

  if (mode === "simple") {
    switch (from) {
      case "draft":
        return ["sent", "expired"];
      case "sent":
        return ["viewed", "accepted", "rejected", "expired"];
      case "viewed":
        return ["accepted", "rejected", "expired"];
      case "accepted":
        return ["converted_to_booking", "expired"];
      default:
        return [];
    }
  }

  switch (from) {
    case "draft":
      return ["pending_approval", "expired"];
    case "pending_approval":
      return ["approved", "draft"];
    case "approved":
      return ["sent", "expired"];
    case "sent":
      return ["viewed", "accepted", "rejected", "expired"];
    case "viewed":
      return ["accepted", "rejected", "expired"];
    case "accepted":
      return ["converted_to_booking", "expired"];
    default:
      return [];
  }
}

export function resolveSendTargetStatus(
  current: QuotationStatus,
  mode: QuotationApprovalMode
): QuotationStatus {
  if (mode === "simple") {
    assertTransition(current, "sent", mode);
    return "sent";
  }
  assertTransition(current, "sent", mode);
  return "sent";
}

export function canEditQuotation(
  status: QuotationStatus,
  hasWriteAll: boolean
): boolean {
  if (hasWriteAll && status === "pending_approval") return true;
  return EDITABLE_QUOTATION_STATUSES.includes(status);
}
