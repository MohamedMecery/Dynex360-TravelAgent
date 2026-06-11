import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { markAllCustomerNotificationsRead } from "@/lib/notifications/customer-notifications-service";

export async function POST() {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const count = await markAllCustomerNotificationsRead(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId
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
