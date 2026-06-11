import type { SupabaseClient } from "@supabase/supabase-js";

export interface StaffNotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  domain_event_id: string | null;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ListStaffNotificationsParams {
  limit?: number;
  unreadOnly?: boolean;
}

export async function listStaffNotifications(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  params: ListStaffNotificationsParams = {}
): Promise<{ data: StaffNotificationRow[]; unreadCount: number }> {
  const limit = Math.min(params.limit ?? 50, 100);

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const { count, error: countError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (countError) throw new Error(countError.message);

  return {
    data: (data ?? []) as StaffNotificationRow[],
    unreadCount: count ?? 0,
  };
}

export async function markStaffNotificationRead(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  notificationId: string
): Promise<StaffNotificationRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("id", notificationId)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as StaffNotificationRow | null) ?? null;
}

export async function markAllStaffNotificationsRead(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: now })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_read", false)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function getStaffUnreadCount(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
