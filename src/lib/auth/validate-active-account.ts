import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  accountStatusErrorCode,
  isActiveUserStatus,
} from "@/lib/auth/account-status";
import { getJwtClaims } from "@/lib/auth/claims";
import {
  DbUserAccess,
  resolveDbUserAccess,
} from "@/lib/auth/resolve-db-user-access";
import { UserStatus } from "@/types";

export interface ActiveAccountContext {
  user: User;
  access: DbUserAccess;
}

export type ActiveAccountGateResult =
  | ActiveAccountContext
  | NextResponse;

function inactiveStatusResponse(status: UserStatus): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: accountStatusErrorCode(status),
        message:
          status === "pending"
            ? "Account is pending activation"
            : status === "inactive"
              ? "Account is inactive"
              : "Account is not active",
      },
    },
    { status: 403 }
  );
}

function jwtStatusMismatchResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "ACCOUNT_STATUS_MISMATCH",
        message: "Session account status does not match profile. Sign in again.",
      },
    },
    { status: 403 }
  );
}

/**
 * DB-backed active account gate + JWT account_status consistency (when claim present).
 */
export async function validateActiveAccountAccess(
  supabase: SupabaseClient,
  user: User
): Promise<ActiveAccountGateResult> {
  const access = await resolveDbUserAccess(supabase, user.id);
  if (!access) {
    return NextResponse.json(
      { error: { code: "TENANT_REQUIRED", message: "Tenant membership not found" } },
      { status: 403 }
    );
  }

  if (!isActiveUserStatus(access.status)) {
    return inactiveStatusResponse(access.status);
  }

  const jwt = getJwtClaims(user);
  if (
    jwt.accountStatus &&
    jwt.accountStatus !== access.status
  ) {
    return jwtStatusMismatchResponse();
  }

  if (jwt.tenantId && jwt.tenantId !== access.tenantId) {
    return NextResponse.json(
      {
        error: {
          code: "SESSION_MISMATCH",
          message: "Session tenant does not match profile",
        },
      },
      { status: 403 }
    );
  }

  return { user, access };
}

/** Middleware / auth-provider: returns access or null if not active. */
export async function resolveActiveDbUserAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<DbUserAccess | null> {
  const access = await resolveDbUserAccess(supabase, userId);
  if (!access || !isActiveUserStatus(access.status)) {
    return null;
  }
  return access;
}
