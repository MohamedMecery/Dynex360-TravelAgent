import type { SupabaseClient } from "@supabase/supabase-js";
import { loadTenantBranding, loadTenantEmailLocale } from "@/lib/email/branding";
import { sendTransactionalEmail } from "@/lib/email/email-service";
import type { SendTransactionalEmailResult } from "@/lib/email/types";

export async function sendPaymentCompletedEmail(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    recipientEmail: string;
    amount: string;
    currency: string;
    referenceNumber?: string;
    domainEventId?: string;
  }
): Promise<SendTransactionalEmailResult> {
  const [branding, locale] = await Promise.all([
    loadTenantBranding(admin, input.tenantId),
    loadTenantEmailLocale(admin, input.tenantId),
  ]);

  const subject =
    locale === "ar"
      ? input.referenceNumber
        ? `تم استلام الدفع — ${input.referenceNumber}`
        : "تم استلام الدفع"
      : input.referenceNumber
        ? `Payment received — Booking ${input.referenceNumber}`
        : "Payment received";

  const html =
    locale === "ar"
      ? `<p>شكراً لك. استلمنا دفعتك بمبلغ <strong>${input.amount} ${input.currency}</strong>.</p>`
      : `<p>Thank you. We received your payment of <strong>${input.amount} ${input.currency}</strong>.</p>`;

  const text = `${subject}. ${input.amount} ${input.currency}.`;

  return sendTransactionalEmail(admin, {
    type: "booking_confirmation",
    tenantId: input.tenantId,
    to: input.recipientEmail,
    locale,
    branding,
    subject,
    html,
    text,
    domainEventId: input.domainEventId,
  });
}
