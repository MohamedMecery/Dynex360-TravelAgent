import { NextRequest, NextResponse } from "next/server";
import { canReadAssignees } from "@/lib/auth/assignees-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { userManagementErrorResponse } from "@/lib/api/require-tenant-admin-users";
import { listAssignableUsers } from "@/lib/users/service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!canReadAssignees(gate.access.role)) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Missing permission to list assignees",
        },
      },
      { status: 403 }
    );
  }

  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const data = await listAssignableUsers(
      gate.supabase,
      gate.access.tenantId,
      search
    );
    return NextResponse.json({ data, meta: { total: data.length } });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
