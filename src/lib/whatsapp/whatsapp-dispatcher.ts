import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWhatsAppAdapter } from "@/lib/whatsapp/provider-factory";
import {
  buildTemplateVariables,
  getTenantWhatsAppSettings,
  resolveApprovedTemplate,
} from "@/lib/whatsapp/template-service";
import {
  getCustomerCommunicationPreferences,
  isWhatsAppOptedIn,
  isWithinQuietHours,
} from "@/lib/whatsapp/preferences-service";
import { normalizePhoneToE164 } from "@/lib/whatsapp/phone-utils";
import { WHATSAPP_EVENT_TYPES } from "@/lib/whatsapp/whatsapp-event-config";
import type { WhatsAppMessageStatus } from "@/lib/whatsapp/types";

export type WhatsAppProcessOutcome = "sent" | "failed" | "skipped";

async function resolveCustomerPhone(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from("customers")
    .select("phone")
    .eq("tenant_id", tenantId)
    .eq("id", customerId)
    .maybeSingle();
  return normalizePhoneToE164((data?.phone as string | null) ?? null);
}

export class WhatsAppDispatcher {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  /** Sprint 9B worker entry — template send + delivery log. */
  async process(event: DomainEventRecord): Promise<WhatsAppProcessOutcome> {
    if (!WHATSAPP_EVENT_TYPES.has(event.event_type)) {
      return "skipped";
    }

    if (!event.customer_id) {
      await this.recordDelivery(event, "unknown", "skipped", {
        errorMessage: "Missing customer_id on domain event",
      });
      return "skipped";
    }

    const settings = await getTenantWhatsAppSettings(this.admin, event.tenant_id);
    if (!settings?.whatsapp_enabled) {
      await this.recordDelivery(event, "unknown", "skipped", {
        errorMessage: "WhatsApp disabled for tenant",
      });
      return "skipped";
    }

    const prefs = await getCustomerCommunicationPreferences(
      this.admin,
      event.tenant_id,
      event.customer_id
    );

    if (!isWhatsAppOptedIn(prefs)) {
      await this.recordDelivery(event, "unknown", "skipped", {
        errorMessage: "Customer has not opted in to WhatsApp",
      });
      return "skipped";
    }

    if (isWithinQuietHours(prefs)) {
      await this.recordDelivery(event, "unknown", "skipped", {
        errorMessage: "Customer quiet hours active",
      });
      return "skipped";
    }

    const language = prefs?.preferred_language ?? "en";
    const template = await resolveApprovedTemplate(
      this.admin,
      event.tenant_id,
      event.event_type,
      language
    );

    if (!template) {
      await this.recordDelivery(event, "unknown", "skipped", {
        errorMessage: `No approved WhatsApp template for ${event.event_type} (${language})`,
      });
      return "skipped";
    }

    const phone = await resolveCustomerPhone(
      this.admin,
      event.tenant_id,
      event.customer_id
    );

    if (!phone) {
      await this.recordDelivery(event, "unknown", "skipped", {
        errorMessage: "Customer has no valid mobile number",
      });
      return "skipped";
    }

    await this.recordDelivery(event, phone, "pending");

    const variables = buildTemplateVariables(event, template.variable_count);
    const adapter = createWhatsAppAdapter(settings.default_provider ?? "meta_cloud", {
      meta_phone_number_id: settings.meta_phone_number_id,
      meta_access_token_secret: settings.meta_access_token_secret,
    });

    const quotationId =
      event.aggregate_type === "quotation" ? event.aggregate_id : null;
    const bookingId =
      event.aggregate_type === "booking" ? event.aggregate_id : null;

    const { data: messageRow, error: insertErr } = await this.admin
      .from("whatsapp_messages")
      .insert({
        tenant_id: event.tenant_id,
        customer_id: event.customer_id,
        domain_event_id: event.id,
        template_id: template.id,
        to_phone_e164: phone,
        template_name: template.meta_template_name,
        language: template.language,
        template_variables: variables,
        provider: settings.default_provider ?? "meta_cloud",
        status: "pending",
        quotation_id: quotationId,
        booking_id: bookingId,
      })
      .select("id")
      .single();

    if (insertErr) {
      await this.recordDelivery(event, phone, "failed", {
        errorMessage: insertErr.message,
      });
      return "failed";
    }

    let result;
    try {
      result = await adapter.sendTemplateMessage({
        toPhoneE164: phone,
        templateName: template.meta_template_name,
        languageCode: template.language,
        bodyVariables: variables,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "WhatsApp send failed";
      await this.updateMessage(messageRow.id as string, "failed", { errorMessage: message });
      await this.recordDelivery(event, phone, "failed", { errorMessage: message });
      return "failed";
    }

    const now = new Date().toISOString();
    const status: WhatsAppMessageStatus =
      result.status === "sent" ? "sent" : "failed";

    await this.updateMessage(messageRow.id as string, status, {
      providerMessageId: result.providerMessageId,
      errorMessage: result.errorMessage,
      sentAt: status === "sent" ? now : undefined,
      failedAt: status === "failed" ? now : undefined,
    });

    const deliveryStatus = status === "sent" ? "sent" : "failed";
    await this.recordDelivery(event, phone, deliveryStatus, {
      errorMessage: result.errorMessage,
      providerId: result.providerMessageId ?? undefined,
    });

    return deliveryStatus;
  }

  private async updateMessage(
    messageId: string,
    status: WhatsAppMessageStatus,
    extra: {
      providerMessageId?: string | null;
      errorMessage?: string;
      sentAt?: string;
      failedAt?: string;
      deliveredAt?: string;
      readAt?: string;
    }
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      provider_message_id: extra.providerMessageId ?? undefined,
      error_message: extra.errorMessage ?? null,
      sent_at: extra.sentAt ?? undefined,
      failed_at: extra.failedAt ?? undefined,
      delivered_at: extra.deliveredAt ?? undefined,
      read_at: extra.readAt ?? undefined,
    };
    const { error } = await this.admin
      .from("whatsapp_messages")
      .update(patch)
      .eq("id", messageId);
    if (error) throw new Error(error.message);
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
        channel: "whatsapp",
        recipient_type: "phone_number",
        recipient_id: recipient,
        status,
        provider_id: extra?.providerId ?? null,
        error_message: extra?.errorMessage ?? null,
        attempted_at: now,
        completed_at: status === "pending" ? null : now,
      },
      { onConflict: "domain_event_id,channel,recipient_id" }
    );
    if (error) {
      throw new Error(`notification_deliveries whatsapp upsert failed: ${error.message}`);
    }
  }
}
