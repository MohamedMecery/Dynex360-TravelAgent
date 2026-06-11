import type { SupabaseClient } from "@supabase/supabase-js";

export interface OperationsMetrics {
  jobs_pending: number;
  jobs_processing: number;
  jobs_failed: number;
  jobs_dead_letter: number;
  jobs_completed_24h: number;
  emails_sent_24h: number;
  emails_failed_24h: number;
  notifications_in_app_sent_24h: number;
  notifications_in_app_failed_24h: number;
  whatsapp_sent_24h: number;
  whatsapp_delivered_24h: number;
  whatsapp_read_24h: number;
  whatsapp_failed_24h: number;
  whatsapp_failure_rate_24h: number;
  domain_events_24h: number;
  event_throughput_per_hour: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function fetchOperationsMetrics(
  admin: SupabaseClient,
  tenantId: string | null
): Promise<OperationsMetrics> {
  const since = new Date(Date.now() - DAY_MS).toISOString();

  const jobQuery = (status: string) => {
    let q = admin
      .from("event_dispatch_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return q;
  };

  const [
    pending,
    processing,
    failed,
    deadLetter,
    completed24h,
    emailsSent,
    emailsFailed,
    inAppSent,
    inAppFailed,
    waSent,
    waDelivered,
    waRead,
    waFailed,
    events24h,
  ] = await Promise.all([
    jobQuery("pending"),
    jobQuery("processing"),
    jobQuery("failed"),
    jobQuery("dead_letter"),
    (() => {
      let q = admin
        .from("event_dispatch_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "email")
        .eq("status", "sent")
        .gte("completed_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "email")
        .eq("status", "failed")
        .gte("attempted_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "in_app")
        .eq("status", "sent")
        .gte("completed_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("channel", "in_app")
        .eq("status", "failed")
        .gte("attempted_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .in("status", ["sent", "delivered", "read"])
        .gte("sent_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "delivered")
        .gte("delivered_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "read")
        .gte("read_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("failed_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
    (() => {
      let q = admin
        .from("domain_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      return q;
    })(),
  ]);

  const eventsCount = events24h.count ?? 0;
  const waSentCount = waSent.count ?? 0;
  const waFailedCount = waFailed.count ?? 0;
  const waAttempted = waSentCount + waFailedCount;
  const waFailureRate =
    waAttempted > 0 ? Math.round((waFailedCount / waAttempted) * 1000) / 10 : 0;

  return {
    jobs_pending: pending.count ?? 0,
    jobs_processing: processing.count ?? 0,
    jobs_failed: failed.count ?? 0,
    jobs_dead_letter: deadLetter.count ?? 0,
    jobs_completed_24h: completed24h.count ?? 0,
    emails_sent_24h: emailsSent.count ?? 0,
    emails_failed_24h: emailsFailed.count ?? 0,
    notifications_in_app_sent_24h: inAppSent.count ?? 0,
    notifications_in_app_failed_24h: inAppFailed.count ?? 0,
    whatsapp_sent_24h: waSentCount,
    whatsapp_delivered_24h: waDelivered.count ?? 0,
    whatsapp_read_24h: waRead.count ?? 0,
    whatsapp_failed_24h: waFailedCount,
    whatsapp_failure_rate_24h: waFailureRate,
    domain_events_24h: eventsCount,
    event_throughput_per_hour: Math.round((eventsCount / 24) * 10) / 10,
  };
}
