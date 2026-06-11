import { NextResponse } from "next/server";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { markStaffNotificationRead } from "@/lib/notifications/staff-notifications-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  const { id } = await context.params;

  try {
    const updated = await markStaffNotificationRead(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
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
