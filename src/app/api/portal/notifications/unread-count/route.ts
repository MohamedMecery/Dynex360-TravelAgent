import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { getCustomerUnreadCount } from "@/lib/notifications/customer-notifications-service";

export async function GET() {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const count = await getCustomerUnreadCount(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId
    );
    return NextResponse.json({ data: { unread_count: count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load unread count";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
