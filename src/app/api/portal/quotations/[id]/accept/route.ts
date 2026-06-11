import { NextResponse } from "next/server";
import {
  portalAcceptQuotation,
  PortalQuotationActionError,
} from "@/lib/portal/portal-quotation-actions-service";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const updated = await portalAcceptQuotation(ctx, id);
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof PortalQuotationActionError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Accept failed";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
