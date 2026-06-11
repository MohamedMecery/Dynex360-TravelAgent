import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { DOMAIN_EVENT_TYPE } from "@/lib/events/types";
import {
  sendQuotationAcceptedEmail,
  sendQuotationRejectedEmail,
} from "@/lib/email/notifications/quotation-portal";
import { sendPaymentCompletedEmail } from "@/lib/email/notifications/payment-completed";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SendTransactionalEmailResult } from "@/lib/email/types";

const EMAIL_EVENT_TYPES = new Set<string>([
  DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED,
  DOMAIN_EVENT_TYPE.QUOTATION_REJECTED,
  DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED,
]);

export type EmailProcessOutcome = "sent" | "failed" | "skipped";

export class EmailDispatcher {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  /** Sprint 8D worker entry — send email and record delivery outcome. */
  async process(event: DomainEventRecord): Promise<EmailProcessOutcome> {
    if (!EMAIL_EVENT_TYPES.has(event.event_type)) {
      return "skipped";
    }

    const recipientEmail = event.payload?.recipient_email as string | undefined;
    if (!recipientEmail?.trim()) {
      await this.recordDelivery(event, recipientEmail ?? "unknown", "skipped", {
        errorMessage: "Missing recipient email in payload",
      });
      return "skipped";
    }

    await this.recordDelivery(event, recipientEmail, "pending");

    let result: SendTransactionalEmailResult;
    try {
      if (event.event_type === DOMAIN_EVENT_TYPE.QUOTATION_ACCEPTED) {
        result = await sendQuotationAcceptedEmail(this.admin, {
          tenantId: event.tenant_id,
          quotationId: event.aggregate_id,
          recipientEmail,
          domainEventId: event.id,
        });
      } else if (event.event_type === DOMAIN_EVENT_TYPE.QUOTATION_REJECTED) {
        result = await sendQuotationRejectedEmail(this.admin, {
          tenantId: event.tenant_id,
          quotationId: event.aggregate_id,
          recipientEmail,
          reason: event.payload?.rejection_reason as string | undefined,
          domainEventId: event.id,
        });
      } else if (event.event_type === DOMAIN_EVENT_TYPE.PAYMENT_COMPLETED) {
        const payRecipient =
          recipientEmail ||
          (event.payload?.recipient_email as string | undefined)?.trim();
        if (!payRecipient) {
          await this.recordDelivery(event, "unknown", "skipped", {
            errorMessage: "Missing recipient email for payment receipt",
          });
          return "skipped";
        }
        result = await sendPaymentCompletedEmail(this.admin, {
          tenantId: event.tenant_id,
          recipientEmail: payRecipient,
          amount: String(event.payload?.amount ?? ""),
          currency: String(event.payload?.currency ?? ""),
          referenceNumber: event.payload?.reference_number as string | undefined,
          domainEventId: event.id,
        });
      } else {
        return "skipped";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Email send failed";
      await this.recordDelivery(event, recipientEmail, "failed", { errorMessage: message });
      return "failed";
    }

    const status =
      result.status === "sent"
        ? "sent"
        : result.status === "failed"
          ? "failed"
          : "skipped";

    await this.recordDelivery(event, recipientEmail, status, {
      errorMessage: result.errorMessage,
      providerId: result.providerId,
    });

    return status;
  }

  private async recordDelivery(
    event: DomainEventRecord,
    recipient: string,
    status: "pending" | "sent" | "failed" | "skipped",
    extra?: { errorMessage?: string; providerId?: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.admin.from("notification_deliveries").upsert(
      {
        tenant_id: event.tenant_id,
        domain_event_id: event.id,
        channel: "email",
        recipient_type: "email_address",
        recipient_id: recipient.toLowerCase(),
        status,
        provider_id: extra?.providerId ?? null,
        error_message: extra?.errorMessage ?? null,
        attempted_at: now,
        completed_at: status === "pending" ? null : now,
      },
      { onConflict: "domain_event_id,channel,recipient_id" }
    );
    if (error) {
      throw new Error(`notification_deliveries email upsert failed: ${error.message}`);
    }
  }
}
