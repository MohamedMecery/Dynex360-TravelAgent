import type { LeadSource, LeadStatus, OpportunityStage } from "@/types/crm";
import type { BookingStatus, QuotationItemType, QuotationStatus } from "@/types/revenue";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_SOURCES: LeadSource[] = [
  "whatsapp",
  "website",
  "facebook",
  "instagram",
  "tiktok",
  "referral",
  "walk_in",
  "phone_call",
  "other",
];

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "discovery",
  "proposal",
  "negotiation",
  "verbal_approval",
  "closed_won",
  "closed_lost",
];

export const OPEN_OPPORTUNITY_STAGES: OpportunityStage[] = [
  "discovery",
  "proposal",
  "negotiation",
  "verbal_approval",
];

export const QUOTATION_STATUSES: QuotationStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "converted_to_booking",
];

export const QUOTATION_ITEM_TYPES: QuotationItemType[] = [
  "package",
  "hotel",
  "flight",
  "visa",
  "transport",
  "insurance",
  "other",
];

export const BOOKING_STATUSES: BookingStatus[] = [
  "draft",
  "confirmed",
  "completed",
  "cancelled",
];

export const QUOTATION_TIMELINE_TYPES = [
  "quotation_created",
  "quotation_sent",
  "quotation_viewed",
  "quotation_accepted",
  "quotation_rejected",
  "quotation_converted",
] as const;

export { formatLabel } from "@/lib/formatLabel";

export function formatMoney(amount: number, currency: string): string {
  return amount.toLocaleString(undefined, { style: "currency", currency });
}
