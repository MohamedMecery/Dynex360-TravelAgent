import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { canReadCrmDashboard } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchOperationsDashboardWidgets } from "@/lib/operations-ai/recommendation-service";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (
    !canReadCrmDashboard(gate.access.role) ||
    !hasAiPermission(gate.access.role, "ai.operations.read")
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing operations dashboard permission" } },
      { status: 403 }
    );
  }

  try {
    const data = await fetchOperationsDashboardWidgets(gate.supabase);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load widgets",
        },
      },
      { status: 500 }
    );
  }
}
