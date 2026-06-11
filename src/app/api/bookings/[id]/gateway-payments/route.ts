import { NextResponse } from "next/server";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchGatewayPaymentsForBooking } from "@/lib/payments/gateway-payments-query-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  const { id } = await context.params;

  try {
    const data = await fetchGatewayPaymentsForBooking(gate.access.tenantId, id);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load gateway payments";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
