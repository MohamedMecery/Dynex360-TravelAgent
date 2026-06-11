import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { listCustomerNotifications } from "@/lib/notifications/customer-notifications-service";

export async function GET(request: Request) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await listCustomerNotifications(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
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
