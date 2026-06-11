import { NextResponse } from "next/server";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { listStaffNotifications } from "@/lib/notifications/staff-notifications-service";

export async function GET(request: Request) {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await listStaffNotifications(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      { unreadOnly, limit }
    );
    return NextResponse.json({
      data: result.data,
      meta: { unread_count: result.unreadCount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
