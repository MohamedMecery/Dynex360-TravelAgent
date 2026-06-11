import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import {
  createPortalQuotationCheckout,
  PortalCheckoutError,
} from "@/lib/payments/portal-checkout-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await context.params;
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  try {
    const result = await createPortalQuotationCheckout(ctx, id, idempotencyKey ?? undefined);
    return NextResponse.json({
      data: {
        payment_order: result.order,
        payment_attempt: result.attempt,
        checkout_url: result.checkout_url,
      },
    });
  } catch (err) {
    if (err instanceof PortalCheckoutError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
