import { NextResponse } from "next/server";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { markAllStaffNotificationsRead } from "@/lib/notifications/staff-notifications-service";

export async function POST() {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  try {
    const count = await markAllStaffNotificationsRead(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id
    );
    return NextResponse.json({ data: { marked_read: count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark notifications read";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
