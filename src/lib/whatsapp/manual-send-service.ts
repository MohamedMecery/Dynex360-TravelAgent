import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWhatsAppAdapter } from "@/lib/whatsapp/provider-factory";
import { getTemplateById, getTenantWhatsAppSettings } from "@/lib/whatsapp/template-service";
import {
  getCustomerCommunicationPreferences,
  isWhatsAppOptedIn,
  isWithinQuietHours,
} from "@/lib/whatsapp/preferences-service";
import { normalizePhoneToE164 } from "@/lib/whatsapp/phone-utils";

export interface ManualWhatsAppSendInput {
  tenantId: string;
  customerId: string;
  templateId: string;
  bodyVariables: string[];
  initiatedByUserId: string;
  quotationId?: string | null;
  bookingId?: string | null;
}

export class ManualWhatsAppSendService {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  async send(input: ManualWhatsAppSendInput) {
    const settings = await getTenantWhatsAppSettings(this.admin, input.tenantId);
    if (!settings?.whatsapp_enabled) {
      throw new Error("WhatsApp is not enabled for this tenant");
    }

    const template = await getTemplateById(
      this.admin,
      input.tenantId,
      input.templateId
    );
    if (!template || template.meta_status !== "approved" || !template.is_active) {
      throw new Error("Template is not approved for sending");
    }

    const prefs = await getCustomerCommunicationPreferences(
      this.admin,
      input.tenantId,
      input.customerId
    );
    if (!isWhatsAppOptedIn(prefs)) {
      throw new Error("Customer has not opted in to WhatsApp");
    }
    if (isWithinQuietHours(prefs)) {
      throw new Error("Cannot send during customer quiet hours");
    }

    const { data: customer } = await this.admin
      .from("customers")
      .select("phone")
      .eq("id", input.customerId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();

    const phone = normalizePhoneToE164((customer?.phone as string | null) ?? null);
    if (!phone) throw new Error("Customer has no valid mobile number");

    if (input.bodyVariables.length !== template.variable_count) {
      throw new Error(
        `Template requires ${template.variable_count} variables, got ${input.bodyVariables.length}`
      );
    }

    const { data: messageRow, error: insertErr } = await this.admin
      .from("whatsapp_messages")
      .insert({
        tenant_id: input.tenantId,
        customer_id: input.customerId,
        template_id: template.id,
        to_phone_e164: phone,
        template_name: template.meta_template_name,
        language: template.language,
        template_variables: input.bodyVariables,
        provider: settings.default_provider ?? "meta_cloud",
        status: "pending",
        quotation_id: input.quotationId ?? null,
        booking_id: input.bookingId ?? null,
        initiated_by_user_id: input.initiatedByUserId,
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    const adapter = createWhatsAppAdapter(settings.default_provider ?? "meta_cloud", {
      meta_phone_number_id: settings.meta_phone_number_id,
      meta_access_token_secret: settings.meta_access_token_secret,
    });

    const result = await adapter.sendTemplateMessage({
      toPhoneE164: phone,
      templateName: template.meta_template_name,
      languageCode: template.language,
      bodyVariables: input.bodyVariables,
    });

    const now = new Date().toISOString();
    const status = result.status === "sent" ? "sent" : "failed";

    const { data: updated, error: updateErr } = await this.admin
      .from("whatsapp_messages")
      .update({
        status,
        provider_message_id: result.providerMessageId,
        error_message: result.errorMessage ?? null,
        sent_at: status === "sent" ? now : null,
        failed_at: status === "failed" ? now : null,
        updated_at: now,
      })
      .eq("id", messageRow.id)
      .select("*")
      .single();

    if (updateErr) throw new Error(updateErr.message);
    if (status === "failed") {
      throw new Error(result.errorMessage ?? "WhatsApp send failed");
    }

    return updated;
  }
}
