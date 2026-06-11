import type { TimelineEvent } from "@/lib/crm/timeline-events";
import type {
  Booking,
  CrmActivity,
  Customer,
  CustomerAddress,
  CustomerContact,
  InvoiceStatus,
  Opportunity,
  OpportunityStage,
  PaymentMethod,
} from "@/types";

export interface Customer360Summary {
  booking_count: number;
  confirmed_booking_count: number;
  open_opportunity_count: number;
  weighted_pipeline?: number | null;
  activity_count: number;
  last_activity_at: string | null;
  total_revenue?: number | null;
  outstanding_balance?: number | null;
  lifetime_customer_value?: number | null;
  ytd_revenue?: number | null;
  avg_booking_value?: number | null;
  currency: string;
}

export interface BookingSummary {
  id: string;
  reference_number: string;
  status: Booking["status"];
  payment_status: Booking["payment_status"];
  total_amount: number;
  currency: string;
  travel_date: string | null;
  created_at: string;
  package_title?: string | null;
}

export interface InvoiceSummary {
  id: string;
  invoice_number: string;
  booking_id: string;
  booking_reference?: string | null;
  status: InvoiceStatus;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  currency: string;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  reference_number: string | null;
  booking_id: string;
  invoice_id: string | null;
}

export interface SupportTicketSummary {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export interface Customer360Revenue {
  lifetime_customer_value: number;
  ytd_revenue: number;
  outstanding_balance: number;
  avg_booking_value: number;
  currency: string;
}

export interface Customer360Tabs {
  bookings: BookingSummary[];
  invoices: InvoiceSummary[];
  payments: PaymentSummary[];
  tickets: SupportTicketSummary[];
  activities: CrmActivity[];
  opportunities: Opportunity[];
  revenue?: Customer360Revenue;
}

export interface Customer360Meta {
  warnings?: { code: string; message: string }[];
  permissions: {
    financial: boolean;
    crm_opportunities: boolean;
    crm_activities: boolean;
    crm_write_activity: boolean;
    crm_write_opportunity: boolean;
  };
}

export interface Customer360Payload {
  customer: Customer;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  summary: Customer360Summary;
  tabs: Customer360Tabs;
  timeline_preview: TimelineEvent[];
  meta: Customer360Meta;
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

export const OPEN_OPPORTUNITY_STAGES: OpportunityStage[] = [
  "discovery",
  "proposal",
  "negotiation",
  "verbal_approval",
];
