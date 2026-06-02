import type { SupabaseClient } from "@supabase/supabase-js";
import { UserRole } from "@/types";

export class UserManagementError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}

export async function countActiveTenantAdmins(
  supabase: SupabaseClient,
  tenantId: string,
  excludeUserId?: string
): Promise<number> {
  const { data: adminRole, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "tenant_admin")
    .single();

  if (roleError || !adminRole) {
    throw new UserManagementError("Failed to resolve tenant_admin role", "ROLE_LOOKUP_FAILED");
  }

  const { data: assignments, error } = await supabase
    .from("user_roles")
    .select("user_id, users!inner(status)")
    .eq("tenant_id", tenantId)
    .eq("role_id", adminRole.id);

  if (error) {
    throw new UserManagementError(error.message, "ADMIN_COUNT_FAILED");
  }

  return (assignments ?? []).filter((row) => {
    const userId = row.user_id as string;
    const status = (row.users as { status?: string } | null)?.status;
    if (excludeUserId && userId === excludeUserId) return false;
    return status === "active";
  }).length;
}

export function assertNotSelf(actorId: string, targetUserId: string, action: string): void {
  if (actorId === targetUserId) {
    throw new UserManagementError(`Cannot ${action} your own account`, "SELF_ACTION_FORBIDDEN");
  }
}

export async function assertCanDemoteOrDeactivateAdmin(
  supabase: SupabaseClient,
  tenantId: string,
  targetUserId: string,
  targetRole: UserRole | null
): Promise<void> {
  if (targetRole !== "tenant_admin") return;

  const remaining = await countActiveTenantAdmins(supabase, tenantId, targetUserId);
  if (remaining < 1) {
    throw new UserManagementError(
      "Cannot remove or deactivate the last active tenant administrator",
      "LAST_ADMIN_PROTECTED"
    );
  }
}

export async function assertCanChangeOwnRole(
  supabase: SupabaseClient,
  tenantId: string,
  actorId: string,
  targetUserId: string,
  currentRole: UserRole | null,
  newRole: UserRole
): Promise<void> {
  if (actorId !== targetUserId) return;
  if (currentRole !== "tenant_admin" || newRole === "tenant_admin") return;

  const otherAdmins = await countActiveTenantAdmins(supabase, tenantId, actorId);
  if (otherAdmins < 1) {
    throw new UserManagementError(
      "Cannot change your role while you are the only active tenant administrator",
      "SELF_LOCKOUT_PREVENTED"
    );
  }
}

export async function assertCanDeactivateSelf(
  actorId: string,
  targetUserId: string
): Promise<void> {
  if (actorId === targetUserId) {
    throw new UserManagementError("Cannot deactivate your own account", "SELF_DEACTIVATE_FORBIDDEN");
  }
}
