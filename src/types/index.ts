import type { AuditUserRef } from "@/lib/audit/record-metadata";

export type { AuditUserRef, RecordAuditFields } from "@/lib/audit/record-metadata";

export type TenantStatus = "active" | "suspended" | "inactive";
export type UserStatus = "active" | "inactive" | "pending";
export type CustomerType = "individual" | "corporate";
export type AddressType = "billing" | "mailing" | "other";
export type TravelerGender = "male" | "female" | "other" | "unspecified";
export type DestinationStatus = "active" | "inactive";
export type PackageStatus = "draft" | "published" | "archived";
export type PricingTier = "adult" | "child" | "infant";
export type BookingStatus = "draft" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "cancelled"
  | "void";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";
export type UserRole = "super_admin" | "tenant_admin" | "sales_agent" | "finance_officer";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "whatsapp"
  | "website"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "referral"
  | "walk_in"
  | "phone_call"
  | "other";

export type PreferredContactChannel = "whatsapp" | "phone" | "email" | "in_person";

export type OpportunityStage =
  | "discovery"
  | "proposal"
  | "negotiation"
  | "verbal_approval"
  | "closed_won"
  | "closed_lost";

export type ActivityType = "call" | "whatsapp" | "email" | "meeting" | "task";

export type ActivityDirection = "incoming" | "outgoing";

export type ActivityStatus = "open" | "in_progress" | "completed" | "cancelled";

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

export type QuotationApprovalMode = "simple" | "standard";

export interface CrmActivity {
  id: string;
  tenant_id: string;
  activity_type: ActivityType;
  direction?: ActivityDirection | null;
  subject: string;
  description?: string | null;
  due_date?: string | null;
  assigned_to: string;
  related_lead_id?: string | null;
  related_opportunity_id?: string | null;
  related_customer_id?: string | null;
  status: ActivityStatus;
  completed_at?: string | null;
  channel_meta?: Record<string, unknown>;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityStageHistoryEntry {
  id: string;
  tenant_id: string;
  opportunity_id: string;
  from_stage: OpportunityStage | null;
  to_stage: OpportunityStage;
  changed_by?: string | null;
  changed_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  lead_number: string;
  full_name: string;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  preferred_contact_channel: PreferredContactChannel;
  source: LeadSource;
  destination_id?: string | null;
  destination_text?: string | null;
  expected_budget?: number | null;
  currency: string;
  travel_date?: string | null;
  pax_count: number;
  notes?: string | null;
  owner_id: string;
  status: LeadStatus;
  customer_id?: string | null;
  last_contacted_at?: string | null;
  last_whatsapp_at?: string | null;
  activity_count?: number;
  last_activity_at?: string | null;
  lost_reason?: string | null;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  tenant_id: string;
  opportunity_number: string;
  lead_id?: string | null;
  customer_id?: string | null;
  destination_id?: string | null;
  destination_text?: string | null;
  expected_budget?: number | null;
  estimated_revenue?: number | null;
  currency: string;
  expected_travel_date?: string | null;
  pax_count: number;
  probability?: number | null;
  expected_close_date?: string | null;
  stage: OpportunityStage;
  owner_id: string;
  notes?: string | null;
  lead_source?: LeadSource | null;
  preferred_contact_channel?: PreferredContactChannel | null;
  whatsapp?: string | null;
  activity_count?: number;
  last_activity_at?: string | null;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

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
  source_quotation_id?: string | null;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  items?: QuotationItem[];
}

export type AiAgentKey = "knowledge" | "booking" | "support" | "sales" | "operations";
export type AiMessageRole = "user" | "assistant" | "system" | "tool";
export type KnowledgeDocumentType = "policy" | "faq" | "contract" | "package" | "sop";
export type KnowledgeDocumentStatus = "processing" | "published" | "archived";
export type AiFeedbackRating = "helpful" | "not_helpful";
export type SupportTicketStatus = "open" | "pending" | "escalated" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";
export type SupportMessageAuthorType = "user" | "customer" | "agent" | "system";

export interface KnowledgeCitation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_type: KnowledgeDocumentType;
  excerpt: string;
  score: number;
}

export interface KnowledgeAgentResponse {
  reply: string;
  citations: KnowledgeCitation[];
  confidence: "low" | "medium" | "high";
  conversation_id: string;
  session_id: string;
  message_id?: string;
}

export interface SupportAgentResponse {
  reply: string;
  citations: KnowledgeCitation[];
  confidence: "low" | "medium" | "high";
  conversation_id: string;
  session_id: string;
  message_id?: string;
  ticket?: {
    id: string;
    ticket_number: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
  };
  booking_summary?: string;
}

export interface BookingPackageRecommendation {
  id: string;
  title: string;
  description?: string;
  duration_days?: number;
  destination_name?: string;
  adult_price?: number;
  currency?: string;
  status: string;
}

export interface BookingAgentCustomerMatch {
  id: string;
  label: string;
  email?: string;
  phone?: string;
}

export interface BookingAgentBookingDetail {
  id: string;
  reference_number: string;
  status: string;
  payment_status: string;
  travel_date?: string;
  total_amount: number;
  currency: string;
  customer_name?: string;
  package_title?: string;
  travelers: { name: string; tier: string; is_lead: boolean }[];
}

export interface BookingDraftPreview {
  customer_id: string;
  package_id: string;
  travel_date: string;
  travelers: {
    first_name: string;
    last_name: string;
    tier: PricingTier;
    traveler_id?: string;
  }[];
  line_items: {
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tier: PricingTier;
  }[];
  total_amount: number;
  currency: string;
  package_title: string;
  customer_name: string;
  notes?: string;
}

export type BookingAgentPendingAction =
  | { type: "create_draft"; preview: BookingDraftPreview }
  | {
      type: "update_draft";
      booking_id: string;
      reference_number?: string;
      travel_date?: string;
      package_id?: string;
      travelers?: BookingDraftPreview["travelers"];
      notes?: string;
    }
  | {
      type: "propose_cancellation";
      booking_id: string;
      reason: string;
      reference_number?: string;
    };

export interface BookingDraftResult {
  booking_id: string;
  reference_number: string;
  action: "draft_created" | "draft_updated" | "cancellation_requested";
  total_amount?: number;
  currency?: string;
}

export interface BookingAgentResponse {
  reply: string;
  intent?: string;
  conversation_id: string;
  session_id: string;
  message_id?: string;
  recommendations?: BookingPackageRecommendation[];
  customers?: BookingAgentCustomerMatch[];
  booking?: BookingAgentBookingDetail;
  draft_preview?: BookingDraftPreview;
  draft?: BookingDraftResult | null;
  pending_action?: BookingAgentPendingAction;
  requires_confirmation: boolean;
  clarifying_questions?: string[];
  cancellation_rules?: string;
}

export interface AiConversation {
  id: string;
  tenant_id: string;
  user_id: string;
  session_id?: string;
  agent_key: AiAgentKey;
  title?: string;
  created_at: string;
  updated_at: string;
  users?: { email?: string; first_name?: string; last_name?: string } | null;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  tenant_id: string;
  role: AiMessageRole;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  tenant_id: string;
  title: string;
  document_type: KnowledgeDocumentType;
  storage_path?: string;
  status: KnowledgeDocumentStatus;
  metadata: Record<string, unknown>;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  tenant_id: string;
  chunk_index: number;
  content: string;
  token_count?: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  customer_id?: string;
  booking_id?: string;
  assigned_user_id?: string;
  subject: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  tenant_id: string;
  author_type: SupportMessageAuthorType;
  author_user_id?: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Country {
  id: string;
  iso2: string;
  iso3?: string;
  name: string;
  phone_code?: string;
  currency_code?: string;
  is_active: boolean;
}

export interface City {
  id: string;
  country_id: string;
  name: string;
  state_region?: string;
  is_active: boolean;
  countries?: Country;
}

export interface Destination {
  id: string;
  tenant_id: string;
  country_id: string;
  city_id?: string;
  name: string;
  slug: string;
  description?: string;
  status: DestinationStatus;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
  countries?: Country;
  cities?: City;
}

export interface Customer {
  id: string;
  tenant_id: string;
  type: CustomerType;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  notes?: string;
  activity_count?: number;
  last_activity_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  tenant_id: string;
  type: AddressType;
  street?: string;
  city_id?: string;
  country_id?: string;
  postal_code?: string;
  created_at?: string;
  updated_at?: string;
  countries?: Country;
  cities?: City;
}

export interface Traveler {
  id: string;
  tenant_id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: TravelerGender;
  nationality_country_id?: string;
  passport_number?: string;
  passport_expiry?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
  customers?: Customer;
  countries?: Country;
}

export interface Package {
  id: string;
  tenant_id: string;
  destination_id?: string;
  title: string;
  description?: string;
  duration_days?: number;
  status: PackageStatus;
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
  destinations?: Destination;
}

export interface PackageDay {
  id: string;
  package_id: string;
  tenant_id: string;
  day_number: number;
  title: string;
  description?: string;
}

export interface PackageDayActivity {
  id: string;
  package_day_id: string;
  tenant_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  sort_order: number;
}

export interface PackagePricing {
  id: string;
  package_id: string;
  tenant_id: string;
  tier: PricingTier;
  amount: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  reference_number: string;
  customer_id: string;
  package_id: string;
  quotation_id?: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  currency: string;
  travel_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
  customers?: Customer;
  packages?: Package;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  tenant_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
  updated_at?: string;
}

/** Frozen booking line copied to `invoices.line_items_snapshot` at issue (D-012). */
export interface InvoiceLineItemSnapshot {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface BookingTravelerRow {
  id: string;
  booking_id: string;
  traveler_id: string;
  tenant_id: string;
  is_lead: boolean;
  price_tier: PricingTier;
  travelers?: Pick<Traveler, "first_name" | "last_name">;
}

export interface BookingStatusHistoryEntry {
  id: string;
  booking_id: string;
  tenant_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  booking_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date?: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  line_items_snapshot?: InvoiceLineItemSnapshot[] | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
  bookings?: Booking;
}

export interface Payment {
  id: string;
  tenant_id: string;
  booking_id: string;
  invoice_id?: string;
  amount: number;
  method: PaymentMethod;
  reference_number?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_by_user?: AuditUserRef | null;
  updated_by_user?: AuditUserRef | null;
  bookings?: Booking;
  invoices?: Invoice;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  tenant_id?: string;
  email: string;
  full_name: string;
  status: UserStatus;
  role?: UserRole;
}
