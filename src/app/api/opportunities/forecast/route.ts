import { NextRequest, NextResponse } from "next/server";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { getOpportunityForecast } from "@/lib/crm/opportunities-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasCrmPermission(gate.access.role, "crm.dashboard.read")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.dashboard.read permission" } },
      { status: 403 }
    );
  }

  try {
    const periodParam = new URL(request.url).searchParams.get("period");
    const period = periodParam === "quarter" ? "quarter" : "month";
    const forecast = await getOpportunityForecast(
      gate.supabase,
      gate.access.tenantId,
      period
    );
    return NextResponse.json({ data: forecast });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
