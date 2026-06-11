import { NextRequest, NextResponse } from "next/server";
import {
  canReadCrmOpportunities,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertOpportunityWriteAccess,
  getOpportunityById,
  softDeleteOpportunity,
  updateOpportunity,
} from "@/lib/crm/opportunities-service";
import { opportunityUpdateSchema } from "@/lib/validation/opportunity";

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
      { error: { code: "FORBIDDEN", message: "Missing crm.opportunities.read permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const opportunity = await getOpportunityById(gate.supabase, gate.access.tenantId, id);
    return NextResponse.json({ data: opportunity });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (
    !hasCrmPermission(gate.access.role, "crm.opportunities.write") &&
    !hasCrmPermission(gate.access.role, "crm.opportunities.write_all")
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.opportunities.write permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const opportunity = await getOpportunityById(gate.supabase, gate.access.tenantId, id);
    assertOpportunityWriteAccess(gate.access.role, opportunity, gate.user.id);

    const body: unknown = await request.json();
    const parsed = opportunityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const updated = await updateOpportunity(
      gate.supabase,
      gate.access.tenantId,
      id,
      parsed.data
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (
    !hasCrmPermission(gate.access.role, "crm.opportunities.write") &&
    !hasCrmPermission(gate.access.role, "crm.opportunities.write_all")
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.opportunities.write permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const opportunity = await getOpportunityById(gate.supabase, gate.access.tenantId, id);
    assertOpportunityWriteAccess(gate.access.role, opportunity, gate.user.id);
    await softDeleteOpportunity(gate.supabase, gate.access.tenantId, id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
