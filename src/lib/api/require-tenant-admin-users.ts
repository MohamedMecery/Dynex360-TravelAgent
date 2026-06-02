import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateActiveAccountAccess } from "@/lib/auth/validate-active-account";
import { hasUsersPermission } from "@/lib/auth/users-permissions";
import { UserManagementError } from "@/lib/users/guards";
import { UserRole } from "@/types";

export interface UsersApiContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  tenantId: string;
  role: UserRole;
}

export async function requireUsersApiAccess(
  permission: string
): Promise<UsersApiContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const gate = await validateActiveAccountAccess(supabase, user);
  if (gate instanceof NextResponse) {
    return gate;
  }

  const { access } = gate;

  if (!hasUsersPermission(access.role, permission)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: `Missing ${permission} permission` } },
      { status: 403 }
    );
  }

  return {
    supabase,
    userId: user.id,
    tenantId: access.tenantId,
    role: access.role,
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
