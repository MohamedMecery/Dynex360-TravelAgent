import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { getPortalDashboard } from "@/lib/portal/portal-dashboard-service";

export async function GET() {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const dashboard = await getPortalDashboard(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId
    );
    return NextResponse.json({ data: dashboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
