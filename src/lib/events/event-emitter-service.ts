import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DomainEventRecord, EmitDomainEventInput } from "@/lib/events/types";

export class DomainEventEmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainEventEmitError";
  }
}

/** Server-side canonical event emitter (service role). */
export class EventEmitterService {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  async emit(input: EmitDomainEventInput): Promise<DomainEventRecord> {
    const { data: eventId, error } = await this.admin.rpc("emit_domain_event", {
      p_tenant_id: input.tenantId,
      p_event_type: input.eventType,
      p_aggregate_type: input.aggregateType,
      p_aggregate_id: input.aggregateId,
      p_customer_id: input.customerId ?? null,
      p_actor_type: input.actorType ?? "system",
      p_actor_user_id: input.actorUserId ?? null,
      p_actor_customer_id: input.actorCustomerId ?? null,
      p_actor_portal_account_id: input.actorPortalAccountId ?? null,
      p_payload: input.payload ?? {},
      p_idempotency_key: input.idempotencyKey,
      p_occurred_at: input.occurredAt ?? new Date().toISOString(),
    });

    if (error) {
      throw new DomainEventEmitError(error.message);
    }
    if (!eventId) {
      throw new DomainEventEmitError("emit_domain_event returned no id");
    }

    const { data: row, error: loadError } = await this.admin
      .from("domain_events")
      .select("*")
      .eq("id", eventId as string)
      .single();

    if (loadError || !row) {
      throw new DomainEventEmitError(loadError?.message ?? "Failed to load emitted event");
    }

    return row as DomainEventRecord;
  }
}

let defaultEmitter: EventEmitterService | null = null;

export function getEventEmitterService(): EventEmitterService {
  if (!defaultEmitter) {
    defaultEmitter = new EventEmitterService();
  }
  return defaultEmitter;
}
