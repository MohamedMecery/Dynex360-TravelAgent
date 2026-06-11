import { NextResponse } from "next/server";
import { canReadCrmLeads } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { countOverdueActivitiesForLead } from "@/lib/crm/activities-service";
import { computeLeadHealth } from "@/lib/crm/lead-health";
import { getLeadById } from "@/lib/crm/leads-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!canReadCrmLeads(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.leads.read permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const lead = await getLeadById(gate.supabase, gate.access.tenantId, id);
    const overdue = await countOverdueActivitiesForLead(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    const health = computeLeadHealth(lead, { overdue_activity_count: overdue });
    return NextResponse.json({ data: health });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
