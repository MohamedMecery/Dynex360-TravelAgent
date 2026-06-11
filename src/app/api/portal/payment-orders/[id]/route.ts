import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import {
  getPortalPaymentOrder,
  PortalCheckoutError,
} from "@/lib/payments/portal-checkout-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;

  try {
    const data = await getPortalPaymentOrder(ctx, id);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof PortalCheckoutError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Failed to load payment order";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
