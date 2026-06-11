import type { PaginatedMeta } from "@/types/crm";

export type QuotationStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted_to_booking";

export type QuotationItemType =
  | "package"
  | "hotel"
  | "flight"
  | "visa"
  | "transport"
  | "insurance"
  | "other";

export type BookingStatus = "draft" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export interface QuotationItem {
  id: string;
  tenant_id: string;
  quotation_id: string;
  sort_order: number;
  item_type: QuotationItemType;
  description: string;
  package_id?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  tenant_id: string;
  quotation_number: string;
  opportunity_id: string;
  customer_id?: string | null;
  status: QuotationStatus;
  valid_until?: string | null;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  terms_and_conditions?: string | null;
  owner_id: string;
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  booking_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export interface QuotationCreateInput {
  opportunity_id: string;
  customer_id?: string | null;
  currency?: string;
  valid_until?: string | null;
  notes?: string | null;
  terms_and_conditions?: string | null;
  discount_amount?: number;
  tax_amount?: number;
  items?: QuotationItemInput[];
}

export interface QuotationUpdateInput {
  customer_id?: string | null;
  valid_until?: string | null;
  notes?: string | null;
  terms_and_conditions?: string | null;
  discount_amount?: number;
  tax_amount?: number;
}

export interface QuotationItemInput {
  item_type: QuotationItemType;
  description: string;
  package_id?: string | null;
  quantity: number;
  unit_price: number;
  sort_order?: number;
}

export interface CustomerSummary {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface BookingListItem {
  id: string;
  reference_number: string;
  customer_id: string;
  package_id: string;
  quotation_id?: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  currency: string;
  travel_date?: string | null;
  notes?: string | null;
  created_at: string;
  customers?: CustomerSummary | null;
  packages?: { id: string; title: string } | null;
}

export interface BookingTraveler {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  passport_number?: string | null;
}

export interface BookingStatusHistoryEntry {
  id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_at: string;
}

export interface BookingItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface BookingDetail extends BookingListItem {
  booking_items: BookingItem[];
  booking_travelers: BookingTraveler[];
  booking_status_history: BookingStatusHistoryEntry[];
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  occurred_at: string;
  ref_table: string;
  ref_id: string;
  meta: Record<string, unknown>;
}

export interface Customer360Summary {
  booking_count: number;
  confirmed_booking_count: number;
  open_opportunity_count: number;
  activity_count: number;
  last_activity_at: string | null;
  total_revenue?: number | null;
  outstanding_balance?: number | null;
  lifetime_customer_value?: number | null;
  currency: string;
}

export interface Customer360Payload {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    created_at: string;
  };
  summary: Customer360Summary;
  tabs: {
    bookings: Array<{
      id: string;
      reference_number: string;
      status: BookingStatus;
      total_amount: number;
      currency: string;
      travel_date: string | null;
    }>;
    opportunities: Array<{
      id: string;
      opportunity_number: string;
      stage: string;
      estimated_revenue?: number | null;
      currency: string;
    }>;
  };
  timeline_preview: TimelineEvent[];
  meta: {
    permissions: {
      financial: boolean;
      crm_opportunities: boolean;
    };
  };
}

export interface Customer360TimelinePage {
  data: TimelineEvent[];
  meta: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
    bucket: string;
  };
}

export type { PaginatedMeta };
