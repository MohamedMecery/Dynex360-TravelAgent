import type { QuotationStatus } from "@/types";

/** Quotation statuses visible to portal customers (post-send lifecycle). */
export const PORTAL_VISIBLE_QUOTATION_STATUSES: QuotationStatus[] = [
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "converted_to_booking",
];

/** Open quotations shown on the customer dashboard. */
export const PORTAL_OPEN_QUOTATION_STATUSES: QuotationStatus[] = [
  "sent",
  "viewed",
  "accepted",
];

/** Active booking statuses for dashboard summary. */
export const PORTAL_ACTIVE_BOOKING_STATUSES = ["draft", "confirmed"] as const;

/** Quotation statuses eligible for customer accept/reject actions. */
export const PORTAL_ACTIONABLE_QUOTATION_STATUSES = ["sent", "viewed"] as const;
