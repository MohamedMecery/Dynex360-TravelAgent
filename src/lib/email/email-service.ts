import { SupabaseClient } from "@supabase/supabase-js";
import { formatFromAddress, isEmailSendingEnabled } from "@/lib/email/config";
import { logEmailDelivery } from "@/lib/email/delivery-log";
import { createEmailProvider } from "@/lib/email/providers/factory";
import type {
  SendTransactionalEmailInput,
  SendTransactionalEmailResult,
  TenantEmailPreferencesExtension,
  TransactionalEmailType,
} from "@/lib/email/types";

function isTypeEnabled(
  type: TransactionalEmailType,
  preferences?: TenantEmailPreferencesExtension
): boolean {
  if (!preferences) return true;
  if (type === "welcome" && preferences.welcome_enabled === false) return false;
  if (type === "booking_confirmation" && preferences.booking_confirmation_enabled === false) {
    return false;
  }
  if (type === "support_ticket" && preferences.support_ticket_enabled === false) return false;
  return true;
}

export async function sendTransactionalEmail(
  supabase: SupabaseClient,
  input: SendTransactionalEmailInput
): Promise<SendTransactionalEmailResult> {
  const recipient = input.to.trim().toLowerCase();

  if (!recipient) {
    const result: SendTransactionalEmailResult = {
      status: "skipped",
      errorMessage: "Missing recipient",
    };
    await logEmailDelivery(supabase, {
      tenantId: input.tenantId,
      emailType: input.type,
      recipient: input.to,
      status: "skipped",
      errorMessage: result.errorMessage,
      domainEventId: input.domainEventId,
    });
    return result;
  }

  if (!isTypeEnabled(input.type, input.preferences)) {
    const result: SendTransactionalEmailResult = {
      status: "skipped",
      errorMessage: "Disabled by tenant preferences extension",
    };
    await logEmailDelivery(supabase, {
      tenantId: input.tenantId,
      emailType: input.type,
      recipient,
      status: "skipped",
      errorMessage: result.errorMessage,
      domainEventId: input.domainEventId,
    });
    return result;
  }

  if (!isEmailSendingEnabled()) {
    const result: SendTransactionalEmailResult = {
      status: "skipped",
      errorMessage: "Email provider not configured",
    };
    await logEmailDelivery(supabase, {
      tenantId: input.tenantId,
      emailType: input.type,
      recipient,
      status: "skipped",
      errorMessage: result.errorMessage,
      domainEventId: input.domainEventId,
    });
    return result;
  }

  const provider = createEmailProvider();
  if (!provider) {
    const result: SendTransactionalEmailResult = {
      status: "skipped",
      errorMessage: "Email provider unavailable",
    };
    await logEmailDelivery(supabase, {
      tenantId: input.tenantId,
      emailType: input.type,
      recipient,
      status: "skipped",
      errorMessage: result.errorMessage,
      domainEventId: input.domainEventId,
    });
    return result;
  }

  try {
    const sendResult = await provider.send({
      from: formatFromAddress(input.branding.companyName),
      to: recipient,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    await logEmailDelivery(supabase, {
      tenantId: input.tenantId,
      emailType: input.type,
      recipient,
      status: "sent",
      domainEventId: input.domainEventId,
    });

    return { status: "sent", providerId: sendResult.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    await logEmailDelivery(supabase, {
      tenantId: input.tenantId,
      emailType: input.type,
      recipient,
      status: "failed",
      errorMessage: message,
      domainEventId: input.domainEventId,
    });
    return { status: "failed", errorMessage: message };
  }
}
