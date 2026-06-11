import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { markCustomerNotificationRead } from "@/lib/notifications/customer-notifications-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const updated = await markCustomerNotificationRead(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      id
    );
    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Notification not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update notification";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
