import { NextRequest, NextResponse } from "next/server";
import {
  requireUsersApiAccess,
  userManagementErrorResponse,
} from "@/lib/api/require-tenant-admin-users";
import { listTenantUsers } from "@/lib/users/service";
import { UserRole, UserStatus } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireUsersApiAccess("users.read");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as UserStatus | null;
    const role = searchParams.get("role") as UserRole | null;
    const search = searchParams.get("search") ?? undefined;

    const data = await listTenantUsers(ctx.supabase, ctx.tenantId, {
      status: status ?? undefined,
      role: role ?? undefined,
      search,
    });

    return NextResponse.json({ data, meta: { total: data.length } });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
