import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { getPortalQuotationById } from "@/lib/portal/portal-quotations-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const quotation = await getPortalQuotationById(
      ctx.supabase,
      ctx.customerId,
      ctx.tenantId,
      id
    );
    return NextResponse.json({ data: quotation });
  } catch (err) {
    const notFound =
      err && typeof err === "object" && "code" in err && err.code === "NOT_FOUND";
    const message = err instanceof Error ? err.message : "Failed to load quotation";
    return NextResponse.json(
      { error: { code: notFound ? "NOT_FOUND" : "INTERNAL", message } },
      { status: notFound ? 404 : 500 }
    );
  }
}
