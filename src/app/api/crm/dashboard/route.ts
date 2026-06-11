import { NextRequest, NextResponse } from "next/server";
import { hasDashboardPermission } from "@/lib/auth/rbac";
import { canReadCrmDashboard } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { fetchCrmDashboard } from "@/lib/crm/crm-dashboard-service";
import {
  crmDashboardQuerySchema,
  resolveCrmDashboardRange,
} from "@/lib/validation/crm-dashboard";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!canReadCrmDashboard(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.dashboard.read permission" } },
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
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid dashboard query parameters",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  try {
    const { from, to } = resolveCrmDashboardRange(parsed.data);
    const includeFinancial = hasDashboardPermission(
      gate.access.role,
      "dashboard.financial"
    );
    const data = await fetchCrmDashboard(
      gate.supabase,
      from,
      to,
      includeFinancial
    );
    return NextResponse.json({ data });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "FORBIDDEN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }
    return crmApiErrorResponse(error);
  }
}
