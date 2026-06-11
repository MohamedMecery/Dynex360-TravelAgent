import type { SupabaseClient } from "@supabase/supabase-js";

export type PortalAccountStatus = "active" | "inactive";

export interface PortalUserAccess {
  accountId: string;
  customerId: string;
  tenantId: string;
  email: string;
  status: PortalAccountStatus;
}

/** Resolves customer portal account from public schema (not JWT). */
export async function resolvePortalUserAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<PortalUserAccess | null> {
  const { data, error } = await supabase
    .from("customer_portal_accounts")
    .select("id, customer_id, tenant_id, email, status")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error || !data?.customer_id || !data.tenant_id) {
    return null;
  }

  return {
    accountId: data.id as string,
    customerId: data.customer_id as string,
    tenantId: data.tenant_id as string,
    email: data.email as string,
    status: data.status as PortalAccountStatus,
  };
}

export function isActivePortalStatus(status: PortalAccountStatus): boolean {
  return status === "active";
}
