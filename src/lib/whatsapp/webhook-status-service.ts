import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedWhatsAppStatusEvent } from "@/lib/whatsapp/types";

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
};

export class WhatsAppWebhookStatusService {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  async applyStatusEvents(events: NormalizedWhatsAppStatusEvent[]): Promise<number> {
    let applied = 0;

    for (const ev of events) {
      const { data: message } = await this.admin
        .from("whatsapp_messages")
        .select("id, tenant_id, domain_event_id, status, to_phone_e164")
        .eq("provider_message_id", ev.providerMessageId)
        .maybeSingle();

      if (!message) continue;

      const current = message.status as string;
      if (
        ev.status !== "failed" &&
        STATUS_RANK[ev.status] <= STATUS_RANK[current]
      ) {
        continue;
      }

      const now = ev.occurredAt ?? new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: ev.status,
        updated_at: new Date().toISOString(),
        error_message: ev.errorMessage ?? null,
      };

      if (ev.status === "sent") patch.sent_at = now;
      if (ev.status === "delivered") patch.delivered_at = now;
      if (ev.status === "read") patch.read_at = now;
      if (ev.status === "failed") patch.failed_at = now;

      const { error } = await this.admin
        .from("whatsapp_messages")
        .update(patch)
        .eq("id", message.id);

      if (error) continue;

      if (message.domain_event_id) {
        const deliveryStatus = ev.status === "failed" ? "failed" : "sent";
        await this.admin.from("notification_deliveries").upsert(
          {
            tenant_id: message.tenant_id,
            domain_event_id: message.domain_event_id,
            channel: "whatsapp",
            recipient_type: "phone_number",
            recipient_id: message.to_phone_e164 as string,
            status: deliveryStatus,
            error_message: ev.errorMessage ?? null,
            completed_at: now,
            attempted_at: now,
          },
          { onConflict: "domain_event_id,channel,recipient_id" }
        );
      }

      applied += 1;
    }

    return applied;
  }
}
