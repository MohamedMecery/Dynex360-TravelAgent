import { NextRequest, NextResponse } from "next/server";
import { canReadCrmOpportunities } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  getOpportunityById,
  listOpportunityStageHistory,
} from "@/lib/crm/opportunities-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!canReadCrmOpportunities(gate.access.role)) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Missing crm.opportunities.read permission",
        },
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    await getOpportunityById(gate.supabase, gate.access.tenantId, id);
    const history = await listOpportunityStageHistory(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    return NextResponse.json({ data: history });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
