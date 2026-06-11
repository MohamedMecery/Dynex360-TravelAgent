import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchCustomerOpsStrip } from "@/lib/operations-ai/recommendation-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasAiPermission(gate.access.role, "ai.operations.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing ai.operations.read permission" } },
      { status: 403 }
    );
  }

  const customerId = request.nextUrl.searchParams.get("customer_id");
  if (!customerId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "customer_id required" } },
      { status: 400 }
    );
  }

  try {
    const data = await fetchCustomerOpsStrip(gate.supabase, customerId);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load customer ops strip",
        },
      },
      { status: 500 }
    );
  }
}
