import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import {
  resolveNotificationCopy,
  shouldNotifyCustomer,
  shouldNotifyStaff,
} from "@/lib/events/notification-copy";
import { createAdminClient } from "@/lib/supabase/admin";

async function recordInAppDelivery(
  admin: SupabaseClient,
  event: DomainEventRecord,
  recipientType: "staff_user" | "customer",
  recipientId: string,
  status: "sent" | "failed" | "skipped" = "sent",
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin.from("notification_deliveries").upsert(
    {
      tenant_id: event.tenant_id,
      domain_event_id: event.id,
      channel: "in_app",
      recipient_type: recipientType,
      recipient_id: recipientId,
      status,
      error_message: errorMessage ?? null,
      attempted_at: now,
      completed_at: now,
    },
    { onConflict: "domain_event_id,channel,recipient_id" }
  );
  if (error) {
    throw new Error(`notification_deliveries in_app upsert failed: ${error.message}`);
  }
}

async function resolveTenantAdminUserIds(
  admin: SupabaseClient,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await admin
    .from("user_roles")
    .select("user_id, roles(name)")
    .eq("tenant_id", tenantId);

  if (error || !data) return [];

  const ids = new Set<string>();
  for (const row of data) {
    const roles = row.roles as { name: string } | { name: string }[] | null;
    const name = Array.isArray(roles) ? roles[0]?.name : roles?.name;
    if (name === "tenant_admin" || name === "super_admin") {
      ids.add(row.user_id as string);
    }
  }
  return [...ids];
}

async function resolveQuotationOwnerId(
  admin: SupabaseClient,
  quotationId: string
): Promise<string | null> {
  const { data } = await admin
    .from("quotations")
    .select("owner_id")
    .eq("id", quotationId)
    .maybeSingle();
  return (data?.owner_id as string) ?? null;
}

export class NotificationDispatcher {
  constructor(private readonly admin: SupabaseClient = createAdminClient()) {}

  /** Sprint 8D worker entry — project in-app notifications (idempotent, throws on hard failure). */
  async process(event: DomainEventRecord): Promise<void> {
    const copy = resolveNotificationCopy(event);
    const errors: string[] = [];

    if (event.customer_id && shouldNotifyCustomer(event.event_type)) {
      try {
        await this.createCustomerNotification(event, copy);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Customer notification failed");
      }
    }

    if (shouldNotifyStaff(event.event_type)) {
      try {
        await this.createStaffNotifications(event, copy);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Staff notification failed");
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }
  }

  private async createCustomerNotification(
    event: DomainEventRecord,
    copy: ReturnType<typeof resolveNotificationCopy>
  ): Promise<void> {
    const { data: existing } = await this.admin
      .from("customer_notifications")
      .select("id")
      .eq("domain_event_id", event.id)
      .maybeSingle();

    if (existing) {
      await recordInAppDelivery(
        this.admin,
        event,
        "customer",
        event.customer_id as string
      );
      return;
    }

    const { error } = await this.admin.from("customer_notifications").insert({
      tenant_id: event.tenant_id,
      customer_id: event.customer_id,
      portal_account_id: event.actor_portal_account_id,
      domain_event_id: event.id,
      type: event.event_type,
      title: copy.title,
      message: copy.message,
      entity_type: copy.entityType ?? null,
      entity_id: copy.entityId ?? null,
      action_url: copy.actionUrl ?? null,
    });

    if (error) {
      await recordInAppDelivery(
        this.admin,
        event,
        "customer",
        event.customer_id as string,
        "failed",
        error.message
      );
      throw new Error(`customer_notifications insert failed: ${error.message}`);
    }

    await recordInAppDelivery(
      this.admin,
      event,
      "customer",
      event.customer_id as string
    );
  }

  private async createStaffNotifications(
    event: DomainEventRecord,
    copy: ReturnType<typeof resolveNotificationCopy>
  ): Promise<void> {
    const recipientIds = new Set<string>();

    for (const adminId of await resolveTenantAdminUserIds(this.admin, event.tenant_id)) {
      recipientIds.add(adminId);
    }

    if (event.aggregate_type === "quotation") {
      const ownerId =
        (event.payload?.owner_id as string | undefined) ??
        (await resolveQuotationOwnerId(this.admin, event.aggregate_id));
      if (ownerId) recipientIds.add(ownerId);
    }

    if (event.payload?.owner_id && typeof event.payload.owner_id === "string") {
      recipientIds.add(event.payload.owner_id);
    }

    const failures: string[] = [];

    for (const userId of recipientIds) {
      const { data: existing } = await this.admin
        .from("notifications")
        .select("id")
        .eq("domain_event_id", event.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await recordInAppDelivery(this.admin, event, "staff_user", userId);
        continue;
      }

      const { error } = await this.admin.from("notifications").insert({
        tenant_id: event.tenant_id,
        user_id: userId,
        domain_event_id: event.id,
        type: event.event_type,
        title: copy.title,
        message: copy.message,
        entity_type: copy.entityType ?? null,
        entity_id: copy.entityId ?? null,
        action_url: copy.staffActionUrl ?? null,
        priority: copy.priority ?? "normal",
      });

      if (error) {
        failures.push(`user ${userId}: ${error.message}`);
        await recordInAppDelivery(
          this.admin,
          event,
          "staff_user",
          userId,
          "failed",
          error.message
        );
        continue;
      }

      await recordInAppDelivery(this.admin, event, "staff_user", userId);
    }

    if (failures.length > 0) {
      throw new Error(`notifications insert failures: ${failures.join(", ")}`);
    }
  }
}
