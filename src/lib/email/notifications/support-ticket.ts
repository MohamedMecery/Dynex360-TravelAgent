import { SupabaseClient } from "@supabase/supabase-js";
import { loadTenantBranding, loadTenantEmailLocale } from "@/lib/email/branding";
import { emailT } from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/email-service";
import { renderSupportTicketEmail } from "@/lib/email/templates/support-ticket";
import type { SendTransactionalEmailResult } from "@/lib/email/types";
import type { SupportTicket } from "@/types";

export async function sendSupportTicketNotificationEmail(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    ticket: SupportTicket;
    assigneeUserId: string | null;
    event: "assigned" | "status_updated";
  }
): Promise<SendTransactionalEmailResult> {
  if (!input.assigneeUserId) {
    return { status: "skipped", errorMessage: "No assignee to notify" };
  }

  const { data: assignee, error } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", input.assigneeUserId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (error || !assignee?.email) {
    return {
      status: "skipped",
      errorMessage: error?.message ?? "Assignee email not found",
    };
  }

  const [branding, locale] = await Promise.all([
    loadTenantBranding(supabase, input.tenantId),
    loadTenantEmailLocale(supabase, input.tenantId),
  ]);

  const eventLabel =
    input.event === "assigned"
      ? emailT(locale, "supportTicket.eventAssigned", { ticket: input.ticket.ticket_number })
      : emailT(locale, "supportTicket.eventStatus", {
          ticket: input.ticket.ticket_number,
          status: input.ticket.status,
        });

  const { subject, html, text } = renderSupportTicketEmail({
    locale,
    branding,
    ticketNumber: input.ticket.ticket_number,
    status: input.ticket.status,
    subject: input.ticket.subject,
    summary: input.ticket.subject,
    ticketUrl: `${branding.siteUrl}/ai/support/tickets/show/${input.ticket.id}`,
    eventLabel,
  });

  return sendTransactionalEmail(supabase, {
    type: "support_ticket",
    tenantId: input.tenantId,
    to: assignee.email,
    locale,
    branding,
    subject,
    html,
    text,
  });
}
