import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchRecommendations } from "@/lib/sales-ai/recommendation-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasAiPermission(gate.access.role, "ai.sales.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing ai.sales.read permission" } },
      { status: 403 }
    );
  }

  const entityType = request.nextUrl.searchParams.get("entity_type");
  const entityId = request.nextUrl.searchParams.get("entity_id");
  const status = request.nextUrl.searchParams.get("status") ?? "open";

  try {
    const data = await fetchRecommendations(gate.supabase, {
      entityType:
        entityType === "lead" || entityType === "opportunity" || entityType === "customer"
          ? entityType
          : undefined,
      entityId: entityId ?? undefined,
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
