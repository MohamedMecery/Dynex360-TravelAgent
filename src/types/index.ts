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

export type AiAgentKey = "knowledge" | "booking" | "support";
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
