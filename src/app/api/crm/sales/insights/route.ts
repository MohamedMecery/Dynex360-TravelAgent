import { NextRequest, NextResponse } from "next/server";
import { hasAiPermission } from "@/lib/auth/rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { fetchSalesInsights } from "@/lib/sales-ai/recommendation-service";
import { resolveCrmDashboardRange, crmDashboardQuerySchema } from "@/lib/validation/crm-dashboard";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasAiPermission(gate.access.role, "ai.sales.insights.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing ai.sales.insights.read permission" } },
      { status: 403 }
    );
  }

  const parsed = crmDashboardQuerySchema.safeParse({
    period: request.nextUrl.searchParams.get("period") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" } },
      { status: 400 }
    );
  }

  try {
    const { from, to } = resolveCrmDashboardRange(parsed.data);
    const data = await fetchSalesInsights(gate.supabase, from, to);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load insights",
        },
      },
      { status: 500 }
    );
  }
}
