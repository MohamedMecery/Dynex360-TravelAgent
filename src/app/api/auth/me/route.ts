import { NextRequest, NextResponse } from "next/server";
import { getEffectivePermissions } from "@/lib/auth/effective-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { authMeQuerySchema } from "@/lib/validation/auth-me";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const parsed = authMeQuerySchema.safeParse({
    include_permissions:
      request.nextUrl.searchParams.get("include_permissions") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const { user, access } = gate;
  const payload: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? "",
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    tenant_id: access.tenantId,
    role: access.role,
    account_status: access.status,
  };

  if (parsed.data.include_permissions) {
    payload.permissions = getEffectivePermissions(access.role);
  }

  return NextResponse.json({ data: payload });
}
