import { SupabaseClient } from "@supabase/supabase-js";
import { findDefaultTicketAssignee } from "@/lib/support/ticket-actions";
import {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types";

const ESCALATION_KEYWORDS = [
  "refund",
  "dispute",
  "legal",
  "lawyer",
  "complaint",
  "escalate",
  "supervisor",
  "manager",
  "استرداد",
  "نزاع",
  "قانوني",
  "محامي",
  "شكوى",
  "تصعيد",
  "مشرف",
  "مدير",
];

function includesKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => {
    const keyLower = keyword.toLowerCase();
    return lower.includes(keyLower) || text.includes(keyword);
  });
}

export function detectEscalation(message: string): boolean {
  return includesKeyword(message, ESCALATION_KEYWORDS);
}

export function detectTicketIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("open ticket") ||
    lower.includes("create ticket") ||
    lower.includes("support ticket") ||
    lower.includes("file a ticket") ||
    lower.includes("escalate") ||
    message.includes("فتح تذكرة") ||
    message.includes("إنشاء تذكرة") ||
    message.includes("انشاء تذكرة") ||
    message.includes("تذكرة دعم") ||
    message.includes("تذكرة") ||
    message.includes("تصعيد")
  );
}

export interface BookingSummary {
  id: string;
  reference_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  currency: string;
  customer_name?: string;
}

export async function lookupBookingByReference(
  supabase: SupabaseClient,
  reference: string
): Promise<BookingSummary | null> {
  const { data } = await supabase
    .from("bookings")
    .select("id, reference_number, status, payment_status, total_amount, currency, customers(first_name, last_name, company_name)")
    .ilike("reference_number", `%${reference}%`)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const customer = data.customers as {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  } | null;

  const customerName =
    customer?.company_name ??
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ??
    undefined;

  return {
    id: data.id,
    reference_number: data.reference_number,
    status: data.status,
    payment_status: data.payment_status,
    total_amount: Number(data.total_amount),
    currency: data.currency,
    customer_name: customerName,
  };
}

export function extractBookingReference(message: string): string | null {
  const match = message.match(/\b(BKG[-\w]+|\bBK-\d{4}-\d+)\b/i);
  return match?.[1] ?? null;
}

export interface CreateTicketInput {
  tenantId: string;
  userId: string;
  subject: string;
  priority?: SupportTicketPriority;
  customerId?: string;
  bookingId?: string;
  initialMessage: string;
}

export interface CreatedTicket {
  id: string;
  ticket_number: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
}

export async function createSupportTicket(
  supabase: SupabaseClient,
  input: CreateTicketInput
): Promise<CreatedTicket> {
  const priority =
    input.priority ?? (detectEscalation(input.subject) ? "high" : "medium");
  const isEscalated = detectEscalation(input.subject);
  const assigneeId =
    isEscalated ? await findDefaultTicketAssignee(supabase, input.tenantId) : null;

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      tenant_id: input.tenantId,
      ticket_number: "",
      subject: input.subject.slice(0, 255),
      priority,
      status: isEscalated ? "escalated" : "open",
      customer_id: input.customerId,
      booking_id: input.bookingId,
      assigned_user_id: assigneeId,
      created_by: input.userId,
    })
    .select("id, ticket_number, status, priority")
    .single();

  if (ticketError || !ticket) {
    throw new Error(ticketError?.message ?? "Failed to create support ticket");
  }

  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    tenant_id: input.tenantId,
    author_type: "agent",
    author_user_id: input.userId,
    content: input.initialMessage,
    metadata: { source: "support_agent" },
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  return ticket as CreatedTicket;
}

export function formatBookingSummary(booking: BookingSummary): string {
  return (
    `Booking ${booking.reference_number}: status ${booking.status}, ` +
    `payment ${booking.payment_status}, total ${booking.currency} ${booking.total_amount}` +
    (booking.customer_name ? `, customer ${booking.customer_name}` : "")
  );
}
