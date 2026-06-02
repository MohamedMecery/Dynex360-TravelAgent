import { NextRequest, NextResponse } from "next/server";
import {
  requireUsersApiAccess,
  userManagementErrorResponse,
} from "@/lib/api/require-tenant-admin-users";
import {
  deactivateTenantUser,
  getTenantUser,
  updateTenantUser,
} from "@/lib/users/service";
import { updateUserSchema } from "@/lib/validation/user-management";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await requireUsersApiAccess("users.read");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const user = await getTenantUser(ctx.supabase, ctx.tenantId, id);
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: user });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await requireUsersApiAccess("users.update");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = updateUserSchema.safeParse(body);
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

    const user = await updateTenantUser(
      ctx.supabase,
      ctx.tenantId,
      ctx.userId,
      id,
      parsed.data
    );
    return NextResponse.json({ data: user });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await requireUsersApiAccess("users.delete");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const user = await deactivateTenantUser(
      ctx.supabase,
      ctx.tenantId,
      ctx.userId,
      id
    );
    return NextResponse.json({ data: user });
  } catch (error) {
    return userManagementErrorResponse(error);
  }
}
