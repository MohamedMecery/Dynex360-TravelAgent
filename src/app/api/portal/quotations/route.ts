import { NextRequest, NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { listPortalQuotations } from "@/lib/portal/portal-quotations-service";

export async function GET(request: NextRequest) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  try {
    const result = await listPortalQuotations(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      { status, page, limit }
    );
    return NextResponse.json({ data: result.data, meta: { total: result.total, page, limit } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list quotations";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
