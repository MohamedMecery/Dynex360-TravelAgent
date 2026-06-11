import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { getPortalProfile } from "@/lib/portal/portal-dashboard-service";

export async function GET() {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const profile = await getPortalProfile(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      ctx.email
    );
    return NextResponse.json({ data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load profile";
    const code =
      err && typeof err === "object" && "code" in err && err.code === "NOT_FOUND"
        ? 404
        : 500;
    return NextResponse.json(
      { error: { code: code === 404 ? "NOT_FOUND" : "INTERNAL", message } },
      { status: code }
    );
  }
}
