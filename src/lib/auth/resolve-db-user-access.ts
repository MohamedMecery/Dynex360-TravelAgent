import type { SupabaseClient } from "@supabase/supabase-js";
import { UserRole, UserStatus } from "@/types";

export interface DbUserAccess {
  tenantId: string;
  role: UserRole;
  status: UserStatus;
}

type RoleJoinRow = {
  roles: { name: string } | { name: string }[] | null;
};

function roleNameFromJoin(row: RoleJoinRow | null | undefined): UserRole | null {
  if (!row?.roles) return null;
  const roles = row.roles;
  const name = Array.isArray(roles) ? roles[0]?.name : roles.name;
  return (name as UserRole) ?? null;
}

/** Authoritative tenant, role, and status from public schema (not JWT). */
export async function resolveDbUserAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<DbUserAccess | null> {
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("tenant_id, status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile?.tenant_id) {
    return null;
  }

  const tenantId = profile.tenant_id as string;
  const status = profile.status as UserStatus;

  const { data: roleRow, error: roleError } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (roleError) {
    return null;
  }

  const role = roleNameFromJoin(roleRow as RoleJoinRow | null);
  if (!role) {
    return null;
  }

  return { tenantId, role, status };
}
