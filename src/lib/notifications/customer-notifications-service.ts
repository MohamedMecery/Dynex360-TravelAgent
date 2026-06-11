import type { SupabaseClient } from "@supabase/supabase-js";

export interface CustomerNotificationRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  portal_account_id: string | null;
  domain_event_id: string | null;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ListCustomerNotificationsParams {
  limit?: number;
  unreadOnly?: boolean;
}

export async function listCustomerNotifications(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  params: ListCustomerNotificationsParams = {}
): Promise<{ data: CustomerNotificationRow[]; unreadCount: number }> {
  const limit = Math.min(params.limit ?? 50, 100);

  let query = supabase
    .from("customer_notifications")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const { count, error: countError } = await supabase
    .from("customer_notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("is_read", false);

  if (countError) throw new Error(countError.message);

  return {
    data: (data ?? []) as CustomerNotificationRow[],
    unreadCount: count ?? 0,
  };
}

export async function markCustomerNotificationRead(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  notificationId: string
): Promise<CustomerNotificationRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("customer_notifications")
    .update({ is_read: true, read_at: now })
    .eq("id", notificationId)
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CustomerNotificationRow | null) ?? null;
}

export async function markAllCustomerNotificationsRead(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("customer_notifications")
    .update({ is_read: true, read_at: now })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("is_read", false)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function getCustomerUnreadCount(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("customer_notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
