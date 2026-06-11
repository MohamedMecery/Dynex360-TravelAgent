import type { SupabaseClient } from "@supabase/supabase-js";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import type {
  ActivityCreateInput,
  ActivityUpdateInput,
} from "@/lib/validation/activity";
import type { ActivityListView } from "@/lib/validation/activity";
import {
  activityToTimelineEvent,
  requiresActivityDirection,
  type TimelineEvent,
} from "@/lib/crm/timeline-events";
import type { ActivityDirection, ActivityType, CrmActivity, UserRole } from "@/types";

export interface ListActivitiesParams {
  view?: ActivityListView;
  lead_id?: string;
  opportunity_id?: string;
  customer_id?: string;
  assigned_to?: string;
  page?: number;
  limit?: number;
}

export function scopeActivityListParams(
  role: UserRole,
  userId: string,
  params: ListActivitiesParams
): ListActivitiesParams {
  const scoped = { ...params };
  if (params.view === "my") {
    scoped.assigned_to = userId;
  }
  if (!hasCrmPermission(role, "crm.activities.read_all")) {
    scoped.assigned_to = scoped.assigned_to ?? userId;
  }
  return scoped;
}

export async function listActivities(
  supabase: SupabaseClient,
  tenantId: string,
  params: ListActivitiesParams
): Promise<{ data: CrmActivity[]; total: number }> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const now = new Date().toISOString();
  const view = params.view ?? "timeline";

  let query = supabase
    .from("activities")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (params.lead_id) query = query.eq("related_lead_id", params.lead_id);
  if (params.opportunity_id) {
    query = query.eq("related_opportunity_id", params.opportunity_id);
  }
  if (params.customer_id) {
    query = query.eq("related_customer_id", params.customer_id);
  }
  if (params.assigned_to) query = query.eq("assigned_to", params.assigned_to);

  if (view === "upcoming") {
    query = query
      .in("status", ["open", "in_progress"])
      .not("due_date", "is", null)
      .gte("due_date", now)
      .order("due_date", { ascending: true });
  } else if (view === "overdue") {
    query = query
      .in("status", ["open", "in_progress"])
      .not("due_date", "is", null)
      .lt("due_date", now)
      .order("due_date", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as CrmActivity[], total: count ?? 0 };
}

export async function listActivityTimelineEvents(
  supabase: SupabaseClient,
  tenantId: string,
  params: ListActivitiesParams
): Promise<{ data: TimelineEvent[]; total: number }> {
  const result = await listActivities(supabase, tenantId, params);
  return {
    data: result.data.map(activityToTimelineEvent),
    total: result.total,
  };
}

export function normalizeActivityDirection(
  activityType: ActivityType,
  direction: ActivityDirection | null | undefined
): ActivityDirection | null {
  if (!requiresActivityDirection(activityType)) {
    return null;
  }
  return direction ?? "outgoing";
}

export function assertActivityDirection(
  activityType: ActivityType,
  direction: ActivityDirection | null | undefined
): void {
  if (requiresActivityDirection(activityType) && !direction) {
    throw new Error("Direction is required for call, WhatsApp, and email activities");
  }
  if (!requiresActivityDirection(activityType) && direction) {
    throw new Error("Direction applies only to call, WhatsApp, and email activities");
  }
}

export async function getActivityById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<CrmActivity> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Activity not found");
  return data as CrmActivity;
}

export function assertActivityWriteAccess(
  role: UserRole,
  activity: CrmActivity,
  userId: string
): void {
  if (hasCrmPermission(role, "crm.activities.write_all")) return;
  if (
    hasCrmPermission(role, "crm.activities.write") &&
    activity.assigned_to === userId
  ) {
    return;
  }
  throw new Error("Forbidden: cannot modify this activity");
}

function resolveCompletedAt(
  status: CrmActivity["status"] | undefined,
  existing: string | null | undefined
): string | null | undefined {
  if (status === "completed") {
    return existing ?? new Date().toISOString();
  }
  if (status === "open" || status === "in_progress" || status === "cancelled") {
    return null;
  }
  return existing;
}

export async function createActivity(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  role: UserRole,
  input: ActivityCreateInput
): Promise<CrmActivity> {
  const assignedTo = input.assigned_to ?? userId;
  if (
    assignedTo !== userId &&
    !hasCrmPermission(role, "crm.activities.write_all")
  ) {
    throw new Error("Forbidden: cannot assign activity to another user");
  }

  const status = input.status ?? "open";
  const completedAt =
    status === "completed" ? new Date().toISOString() : null;
  assertActivityDirection(input.activity_type, input.direction);
  const direction = normalizeActivityDirection(
    input.activity_type,
    input.direction
  );

  const { data, error } = await supabase
    .from("activities")
    .insert({
      tenant_id: tenantId,
      activity_type: input.activity_type,
      direction,
      subject: input.subject,
      description: input.description ?? null,
      due_date: input.due_date ?? null,
      assigned_to: assignedTo,
      related_lead_id: input.related_lead_id ?? null,
      related_opportunity_id: input.related_opportunity_id ?? null,
      related_customer_id: input.related_customer_id ?? null,
      status,
      completed_at: completedAt,
      channel_meta: input.channel_meta ?? {},
      created_by: userId,
      updated_by: userId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CrmActivity;
}

export async function updateActivity(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  role: UserRole,
  id: string,
  input: ActivityUpdateInput
): Promise<CrmActivity> {
  const existing = await getActivityById(supabase, tenantId, id);
  assertActivityWriteAccess(role, existing, userId);

  if (
    input.assigned_to &&
    input.assigned_to !== userId &&
    !hasCrmPermission(role, "crm.activities.write_all")
  ) {
    throw new Error("Forbidden: cannot assign activity to another user");
  }

  const nextType = input.activity_type ?? existing.activity_type;
  const nextDirection =
    input.direction !== undefined ? input.direction : existing.direction;
  assertActivityDirection(nextType, nextDirection);

  const patch: Record<string, unknown> = {
    ...input,
    direction: normalizeActivityDirection(nextType, nextDirection),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  if (input.status !== undefined) {
    patch.completed_at = resolveCompletedAt(
      input.status,
      existing.completed_at
    );
  }

  const { data, error } = await supabase
    .from("activities")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CrmActivity;
}

export async function softDeleteActivity(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function logWhatsAppForLead(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  role: UserRole,
  leadId: string,
  subject: string
): Promise<CrmActivity> {
  return createActivity(supabase, tenantId, userId, role, {
    activity_type: "whatsapp",
    direction: "outgoing",
    subject,
    related_lead_id: leadId,
    status: "completed",
  });
}

export async function countOverdueActivitiesForLead(
  supabase: SupabaseClient,
  tenantId: string,
  leadId: string
): Promise<number> {
  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("related_lead_id", leadId)
    .is("deleted_at", null)
    .in("status", ["open", "in_progress"])
    .lt("due_date", now);

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}
