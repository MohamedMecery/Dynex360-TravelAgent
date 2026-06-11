import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { hasUsersPermission } from "@/lib/auth/users-permissions";
import { UserManagementError } from "@/lib/users/guards";
import { UserRole } from "@/types";

export interface UsersApiContext {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  role: UserRole;
}

export async function requireUsersApiAccess(
  permission: string
): Promise<UsersApiContext | NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!hasUsersPermission(gate.access.role, permission)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: `Missing ${permission} permission` } },
      { status: 403 }
    );
  }

  return {
    supabase: gate.supabase,
    userId: gate.user.id,
    tenantId: gate.access.tenantId,
    role: gate.access.role,
  };
}

export function userManagementErrorResponse(error: unknown): NextResponse {
  if (error instanceof UserManagementError) {
    const code = error.code;
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "INVITE_UNAVAILABLE" || code === "ALREADY_IN_TENANT"
          ? 409
          : code.startsWith("SELF_") || code.includes("LAST_ADMIN") || code.includes("LOCKOUT")
            ? 409
            : 400;
    return NextResponse.json(
      { error: { code, message: error.message } },
      { status }
    );
  }

  if (error instanceof Error && error.message === "SESSION_REVOKE_FAILED") {
    return NextResponse.json(
      { error: { code: "SESSION_REVOKE_FAILED", message: "Failed to revoke user sessions" } },
      { status: 500 }
    );
  }

  console.error("Users API error:", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Request failed",
      },
    },
    { status: 500 }
  );
}
