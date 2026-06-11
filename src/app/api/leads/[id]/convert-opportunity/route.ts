import { NextResponse } from "next/server";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { convertLeadToOpportunity } from "@/lib/crm/leads-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!hasCrmPermission(gate.access.role, "crm.opportunities.write")) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Missing crm.opportunities.write permission",
        },
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const opportunity = await convertLeadToOpportunity(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      id
    );
    return NextResponse.json({ data: { opportunity_id: opportunity.id, opportunity } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
