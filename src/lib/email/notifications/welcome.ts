import { SupabaseClient } from "@supabase/supabase-js";
import { loadTenantBranding, loadTenantEmailLocale } from "@/lib/email/branding";
import { sendTransactionalEmail } from "@/lib/email/email-service";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome";
import type { SendTransactionalEmailResult } from "@/lib/email/types";

export async function sendWelcomeEmail(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    to: string;
    userName: string;
  }
): Promise<SendTransactionalEmailResult> {
  const [branding, locale] = await Promise.all([
    loadTenantBranding(supabase, input.tenantId),
    loadTenantEmailLocale(supabase, input.tenantId),
  ]);

  const { subject, html, text } = renderWelcomeEmail({
    locale,
    branding,
    userName: input.userName,
  });

  return sendTransactionalEmail(supabase, {
    type: "welcome",
    tenantId: input.tenantId,
    to: input.to,
    locale,
    branding,
    subject,
    html,
    text,
  });
}
