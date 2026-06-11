import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import type { OpsEntityType } from "@/lib/operations-ai/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasAiPermission(gate.access.role, "ai.operations.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing ai.operations.read permission" } },
      { status: 403 }
    );
  }

  const entityType = request.nextUrl.searchParams.get("entity_type") as OpsEntityType | null;
  const entityId = request.nextUrl.searchParams.get("entity_id");

  if (!entityType || !entityId) {
    const entityIds = request.nextUrl.searchParams.get("entity_ids")?.split(",").filter(Boolean);
    if (entityType && entityIds?.length) {
      const { data, error } = await gate.supabase
        .from("ai_ops_snapshots")
        .select(
          "entity_id, entity_type, health_score, risk_score, readiness_score, operational_status, confidence, computed_at"
        )
        .eq("entity_type", entityType)
        .in("entity_id", entityIds);

      if (error) {
        return NextResponse.json(
          { error: { code: "INTERNAL_ERROR", message: error.message } },
          { status: 500 }
        );
      }
      return NextResponse.json({ data: data ?? [] });
    }

    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "entity_type and entity_id required" } },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from("ai_ops_snapshots")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
