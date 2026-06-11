import type { SupabaseClient } from "@supabase/supabase-js";
import { SCHEDULED_AUTOMATION_TEMPLATE } from "@/lib/events/job-types";

export interface ScheduledAutomationTemplateRow {
  id: string;
  template_key: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

/** Framework-only registry — templates ship inactive in Sprint 8D. */
export async function listScheduledAutomationTemplates(
  admin: SupabaseClient
): Promise<ScheduledAutomationTemplateRow[]> {
  const { data, error } = await admin
    .from("scheduled_automation_templates")
    .select("*")
    .order("template_key");

  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledAutomationTemplateRow[];
}

export function isKnownAutomationTemplate(key: string): boolean {
  return Object.values(SCHEDULED_AUTOMATION_TEMPLATE).includes(
    key as (typeof SCHEDULED_AUTOMATION_TEMPLATE)[keyof typeof SCHEDULED_AUTOMATION_TEMPLATE]
  );
}

/** Placeholder — no business workflows in 8D. */
export async function enqueueScheduledAutomationRun(
  _admin: SupabaseClient,
  _input: {
    tenantId: string;
    templateKey: string;
    scheduledFor: string;
    idempotencyKey: string;
    payload?: Record<string, unknown>;
  }
): Promise<never> {
  throw new Error("Scheduled automation execution is not enabled in Sprint 8D");
}
