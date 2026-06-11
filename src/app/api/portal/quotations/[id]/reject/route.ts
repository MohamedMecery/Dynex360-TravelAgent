import { NextRequest, NextResponse } from "next/server";
import {
  portalRejectQuotation,
  PortalQuotationActionError,
} from "@/lib/portal/portal-quotation-actions-service";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import { quotationRejectSchema } from "@/lib/validation/quotation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => ({}));
  const parsed = quotationRejectSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  try {
    const updated = await portalRejectQuotation(ctx, id, reason);
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof PortalQuotationActionError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Reject failed";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
