import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAssignableTenantRole } from "@/lib/users/assignable-roles";
import { inviteUnavailableError } from "@/lib/users/invite-errors";
import {
  UserManagementError,
  assertCanChangeOwnRole,
  assertCanDeactivateSelf,
  assertCanDemoteOrDeactivateAdmin,
} from "@/lib/users/guards";
import { getAuthCallbackUrl } from "@/lib/auth/site-url";
import { revokeUserSessions } from "@/lib/users/session-revoke";
import type { InviteUserInput, UpdateUserInput } from "@/lib/validation/user-management";
import type { InviteUserResult, TenantUserListItem } from "@/lib/users/types";
import { UserRole, UserStatus } from "@/types";

type UserRoleJoinRow = {
  user_id: string;
  roles: { name: string } | { name: string }[] | null;
};

function roleFromJoin(row: UserRoleJoinRow | undefined): UserRole | null {
  if (!row?.roles) return null;
  const roles = row.roles;
  const name = Array.isArray(roles) ? roles[0]?.name : roles.name;
  return (name as UserRole) ?? null;
}

function matchesSearch(
  user: TenantUserListItem,
  search: string
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const email = user.email.toLowerCase();
  const name = user.full_name?.toLowerCase() ?? "";
  return email.includes(term) || name.includes(term);
}

export async function listTenantUsers(
  supabase: SupabaseClient,
  tenantId: string,
  filters: { status?: UserStatus; role?: UserRole; search?: string }
): Promise<TenantUserListItem[]> {
  let query = supabase
    .from("users")
    .select("id, email, full_name, status, created_at, user_roles(roles(name))")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    throw new UserManagementError(error.message, "LIST_FAILED");
  }

  let items: TenantUserListItem[] = (data ?? []).map((row) => {
    const joins = row.user_roles as UserRoleJoinRow[] | undefined;
    const role = roleFromJoin(joins?.[0]);
    return {
      id: row.id as string,
      email: row.email as string,
      full_name: (row.full_name as string | null) ?? null,
      status: row.status as UserStatus,
      role,
      created_at: row.created_at as string,
    };
  });

  if (filters.search?.trim()) {
    items = items.filter((u) => matchesSearch(u, filters.search!));
  }

  if (filters.role) {
    items = items.filter((u) => u.role === filters.role);
  }

  return items;
}

export async function getTenantUser(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<TenantUserListItem | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, status, created_at, user_roles(roles(name))")
    .eq("tenant_id", tenantId)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new UserManagementError(error.message, "GET_FAILED");
  }
  if (!data) return null;

  const joins = data.user_roles as UserRoleJoinRow[] | undefined;
  return {
    id: data.id as string,
    email: data.email as string,
    full_name: (data.full_name as string | null) ?? null,
    status: data.status as UserStatus,
    role: roleFromJoin(joins?.[0]),
    created_at: data.created_at as string,
  };
}

async function resolveRoleId(supabase: SupabaseClient, roleName: UserRole): Promise<string> {
  const { data, error } = await supabase.from("roles").select("id").eq("name", roleName).single();
  if (error || !data) {
    throw new UserManagementError(`Role not found: ${roleName}`, "ROLE_NOT_FOUND");
  }
  return data.id as string;
}

async function assertNoForeignTenantMembership(
  admin: SupabaseClient,
  authUserId: string,
  tenantId: string
): Promise<void> {
  const { data: foreignRoles, error } = await admin
    .from("user_roles")
    .select("tenant_id")
    .eq("user_id", authUserId)
    .neq("tenant_id", tenantId);

  if (error) {
    throw new UserManagementError(error.message, "MEMBERSHIP_CHECK_FAILED");
  }

  if ((foreignRoles ?? []).length > 0) {
    throw inviteUnavailableError("INVITE_UNAVAILABLE");
  }
}

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | undefined> {
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new UserManagementError(error.message, "AUTH_LIST_FAILED");
    }

    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return undefined;
}

export async function inviteTenantUser(
  supabase: SupabaseClient,
  tenantId: string,
  input: InviteUserInput
): Promise<InviteUserResult> {
  if (!isAssignableTenantRole(input.role)) {
    throw new UserManagementError("Invalid role for invite", "INVALID_ROLE");
  }

  const admin = createAdminClient();
  const email = input.email;

  const { data: existingProfile } = await admin
    .from("users")
    .select("id, tenant_id, status")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile?.tenant_id === tenantId) {
    throw new UserManagementError(
      "User is already a member of this tenant",
      "ALREADY_IN_TENANT"
    );
  }

  if (existingProfile?.tenant_id && existingProfile.tenant_id !== tenantId) {
    throw inviteUnavailableError("INVITE_UNAVAILABLE");
  }

  if (existingProfile && !existingProfile.tenant_id) {
    throw inviteUnavailableError("INVITE_UNAVAILABLE");
  }

  let authUserId = existingProfile?.id as string | undefined;

  if (!authUserId) {
    authUserId = await findAuthUserIdByEmail(admin, email);
  }

  if (authUserId) {
    await assertNoForeignTenantMembership(admin, authUserId, tenantId);
    throw inviteUnavailableError("INVITE_UNAVAILABLE");
  }

  const onboardingRedirect = getAuthCallbackUrl("/onboarding");
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: input.full_name },
      redirectTo: onboardingRedirect,
    }
  );

  if (inviteError || !invited.user) {
    if (inviteError?.message?.toLowerCase().includes("already")) {
      throw inviteUnavailableError("INVITE_UNAVAILABLE");
    }
    throw new UserManagementError(
      inviteError?.message ?? "Failed to invite auth user",
      "AUTH_CREATE_FAILED"
    );
  }

  authUserId = invited.user.id;
  const emailSent = true;

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: onboardingRedirect },
  });

  const onboardingLink = linkData?.properties?.action_link;

  const { error: profileError } = await admin.from("users").insert({
    id: authUserId,
    tenant_id: tenantId,
    email,
    full_name: input.full_name,
    status: "pending",
  });

  if (profileError) {
    throw new UserManagementError(profileError.message, "PROFILE_INSERT_FAILED");
  }

  const roleId = await resolveRoleId(admin, input.role);
  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: authUserId,
    role_id: roleId,
    tenant_id: tenantId,
  });

  if (roleError) {
    throw new UserManagementError(roleError.message, "ROLE_ASSIGN_FAILED");
  }

  const user = await getTenantUser(supabase, tenantId, authUserId);
  if (!user) {
    throw new UserManagementError("User created but could not be loaded", "LOAD_FAILED");
  }

  return {
    user,
    onboarding_link: onboardingLink,
    email_sent: emailSent,
  };
}

export async function updateTenantUser(
  supabase: SupabaseClient,
  tenantId: string,
  actorId: string,
  targetUserId: string,
  input: UpdateUserInput
): Promise<TenantUserListItem> {
  const existing = await getTenantUser(supabase, tenantId, targetUserId);
  if (!existing) {
    throw new UserManagementError("User not found", "NOT_FOUND");
  }

  const admin = createAdminClient();
  let mustRevokeSessions = false;

  if (input.role) {
    await assertCanChangeOwnRole(
      supabase,
      tenantId,
      actorId,
      targetUserId,
      existing.role,
      input.role
    );

    if (existing.role === "tenant_admin" && input.role !== "tenant_admin") {
      await assertCanDemoteOrDeactivateAdmin(supabase, tenantId, targetUserId, existing.role);
    }

    const roleId = await resolveRoleId(supabase, input.role);
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: targetUserId, role_id: roleId, tenant_id: tenantId },
        { onConflict: "user_id,tenant_id" }
      );
    if (roleError) {
      throw new UserManagementError(roleError.message, "ROLE_UPDATE_FAILED");
    }
    mustRevokeSessions = true;
  }

  if (input.status) {
    if (input.status === "inactive") {
      await assertCanDeactivateSelf(actorId, targetUserId);
      if (existing.role === "tenant_admin") {
        await assertCanDemoteOrDeactivateAdmin(supabase, tenantId, targetUserId, existing.role);
      }
    }

    const { error: statusError } = await supabase
      .from("users")
      .update({ status: input.status })
      .eq("id", targetUserId)
      .eq("tenant_id", tenantId);
    if (statusError) {
      throw new UserManagementError(statusError.message, "STATUS_UPDATE_FAILED");
    }

    mustRevokeSessions = true;

    if (input.status === "inactive") {
      const { error: banError } = await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876000h",
      });
      if (banError) {
        throw new UserManagementError(banError.message, "AUTH_BAN_FAILED");
      }
    } else if (input.status === "active") {
      const { error: unbanError } = await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
      });
      if (unbanError) {
        throw new UserManagementError(unbanError.message, "AUTH_UNBAN_FAILED");
      }
    }
  }

  if (mustRevokeSessions) {
    await revokeUserSessions(targetUserId);
  }

  const updated = await getTenantUser(supabase, tenantId, targetUserId);
  if (!updated) {
    throw new UserManagementError("User not found after update", "LOAD_FAILED");
  }
  return updated;
}

export async function deactivateTenantUser(
  supabase: SupabaseClient,
  tenantId: string,
  actorId: string,
  targetUserId: string
): Promise<TenantUserListItem> {
  return updateTenantUser(supabase, tenantId, actorId, targetUserId, { status: "inactive" });
}

export async function activateTenantUser(
  supabase: SupabaseClient,
  tenantId: string,
  actorId: string,
  targetUserId: string
): Promise<TenantUserListItem> {
  return updateTenantUser(supabase, tenantId, actorId, targetUserId, { status: "active" });
}
