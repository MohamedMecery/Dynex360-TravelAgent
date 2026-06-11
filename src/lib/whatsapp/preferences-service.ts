import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhatsAppTemplateLanguage } from "@/lib/whatsapp/types";

export interface CustomerCommunicationPreferences {
  id: string;
  tenant_id: string;
  customer_id: string;
  preferred_language: WhatsAppTemplateLanguage;
  whatsapp_opt_in_at: string | null;
  whatsapp_opt_out_at: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
}

export function isWhatsAppOptedIn(prefs: CustomerCommunicationPreferences | null): boolean {
  if (!prefs?.whatsapp_opt_in_at) return false;
  if (!prefs.whatsapp_opt_out_at) return true;
  return (
    new Date(prefs.whatsapp_opt_in_at).getTime() >
    new Date(prefs.whatsapp_opt_out_at).getTime()
  );
}

export function isWithinQuietHours(
  prefs: CustomerCommunicationPreferences | null,
  at: Date = new Date()
): boolean {
  if (!prefs?.quiet_hours_start || !prefs.quiet_hours_end) return false;

  const tz = prefs.quiet_hours_timezone || "Africa/Cairo";
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const nowMinutes = hour * 60 + minute;

  const [startH, startM] = prefs.quiet_hours_start.split(":").map(Number);
  const [endH, endM] = prefs.quiet_hours_end.split(":").map(Number);
  const start = startH * 60 + (startM || 0);
  const end = endH * 60 + (endM || 0);

  if (start === end) return false;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

export async function getCustomerCommunicationPreferences(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<CustomerCommunicationPreferences | null> {
  const { data } = await admin
    .from("customer_communication_preferences")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .maybeSingle();
  return (data as CustomerCommunicationPreferences | null) ?? null;
}

export async function upsertCustomerCommunicationPreferences(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  patch: Partial<{
    preferred_language: WhatsAppTemplateLanguage;
    whatsapp_opt_in: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    quiet_hours_timezone: string;
  }>
): Promise<CustomerCommunicationPreferences> {
  const existing = await getCustomerCommunicationPreferences(admin, tenantId, customerId);
  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    customer_id: customerId,
    updated_at: now,
  };

  if (patch.preferred_language) row.preferred_language = patch.preferred_language;
  if (patch.quiet_hours_start !== undefined) row.quiet_hours_start = patch.quiet_hours_start;
  if (patch.quiet_hours_end !== undefined) row.quiet_hours_end = patch.quiet_hours_end;
  if (patch.quiet_hours_timezone) row.quiet_hours_timezone = patch.quiet_hours_timezone;

  if (patch.whatsapp_opt_in === true) {
    row.whatsapp_opt_in_at = now;
    row.whatsapp_opt_out_at = null;
  } else if (patch.whatsapp_opt_in === false) {
    row.whatsapp_opt_out_at = now;
  }

  if (existing) {
    const { data, error } = await admin
      .from("customer_communication_preferences")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as CustomerCommunicationPreferences;
  }

  const { data, error } = await admin
    .from("customer_communication_preferences")
    .insert({
      ...row,
      preferred_language: patch.preferred_language ?? "en",
      quiet_hours_timezone: patch.quiet_hours_timezone ?? "Africa/Cairo",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerCommunicationPreferences;
}
