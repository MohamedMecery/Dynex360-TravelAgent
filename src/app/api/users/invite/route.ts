import { NextRequest, NextResponse } from "next/server";
import {
  requireUsersApiAccess,
  userManagementErrorResponse,
} from "@/lib/api/require-tenant-admin-users";
import { inviteTenantUser } from "@/lib/users/service";
import { inviteUserSchema } from "@/lib/validation/user-management";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await requireUsersApiAccess("users.create");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body: unknown = await request.json();
    const parsed = inviteUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await inviteTenantUser(ctx.supabase, ctx.tenantId, parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
