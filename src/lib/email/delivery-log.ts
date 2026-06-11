import { SupabaseClient } from "@supabase/supabase-js";
import type { EmailDeliveryStatus, TransactionalEmailType } from "@/lib/email/types";

export async function logEmailDelivery(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    emailType: TransactionalEmailType;
    recipient: string;
    status: EmailDeliveryStatus;
    errorMessage?: string;
    domainEventId?: string;
  }
): Promise<void> {
  const { error } = await supabase.from("email_delivery_logs").insert({
    tenant_id: input.tenantId,
    email_type: input.emailType,
    recipient: input.recipient,
    status: input.status,
    error_message: input.errorMessage ?? null,
    domain_event_id: input.domainEventId ?? null,
  });

  if (error) {
    console.error("email_delivery_logs insert failed:", error.message);
  }
}
