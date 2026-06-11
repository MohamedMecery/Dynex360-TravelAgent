import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchOpsRecommendations } from "@/lib/operations-ai/recommendation-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasAiPermission(gate.access.role, "ai.operations.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing ai.operations.read permission" } },
      { status: 403 }
    );
  }

  const entityType = request.nextUrl.searchParams.get("entity_type");
  const entityId = request.nextUrl.searchParams.get("entity_id");
  const customerId = request.nextUrl.searchParams.get("customer_id");
  const status = request.nextUrl.searchParams.get("status") ?? "open";

  try {
    const data = await fetchOpsRecommendations(gate.supabase, {
      entityType: entityType === "booking" ? "booking" : undefined,
      entityId: entityId ?? undefined,
      customerId: customerId ?? undefined,
      status,
      limit: 50,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load recommendations",
        },
      },
      { status: 500 }
    );
  }
}
