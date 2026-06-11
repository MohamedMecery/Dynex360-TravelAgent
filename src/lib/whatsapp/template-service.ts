import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventRecord } from "@/lib/events/types";
import type { WhatsAppTemplateLanguage, WhatsAppTemplateRecord } from "@/lib/whatsapp/types";

export async function getTenantWhatsAppSettings(
  admin: SupabaseClient,
  tenantId: string
) {
  const { data } = await admin
    .from("tenant_whatsapp_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data;
}

export async function resolveApprovedTemplate(
  admin: SupabaseClient,
  tenantId: string,
  eventType: string,
  language: WhatsAppTemplateLanguage
): Promise<WhatsAppTemplateRecord | null> {
  const { data } = await admin
    .from("whatsapp_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("event_type", eventType)
    .eq("language", language)
    .eq("meta_status", "approved")
    .eq("is_active", true)
    .maybeSingle();

  return (data as WhatsAppTemplateRecord | null) ?? null;
}

export async function getTemplateById(
  admin: SupabaseClient,
  tenantId: string,
  templateId: string
): Promise<WhatsAppTemplateRecord | null> {
  const { data } = await admin
    .from("whatsapp_templates")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", templateId)
    .maybeSingle();
  return (data as WhatsAppTemplateRecord | null) ?? null;
}

/** Build template body variables from domain event payload (ordered). */
export function buildTemplateVariables(
  event: DomainEventRecord,
  variableCount: number
): string[] {
  const p = event.payload ?? {};
  const candidates = [
    String(p.customer_name ?? ""),
    String(p.quotation_number ?? p.reference_number ?? ""),
    String(p.amount ?? ""),
    String(p.currency ?? ""),
    String(p.portal_url ?? p.action_url ?? ""),
  ].filter((v) => v.length > 0);

  if (variableCount <= 0) return [];
  const vars = candidates.slice(0, variableCount);
  while (vars.length < variableCount) vars.push("—");
  return vars;
}
