import { NextRequest, NextResponse } from "next/server";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertLeadWriteAccess,
  assignLead,
  getLeadById,
} from "@/lib/crm/leads-service";
import { leadAssignSchema } from "@/lib/validation/lead";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (
    !hasCrmPermission(gate.access.role, "crm.leads.write") &&
    !hasCrmPermission(gate.access.role, "crm.leads.write_all")
  ) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.leads.write permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const lead = await getLeadById(gate.supabase, gate.access.tenantId, id);
    assertLeadWriteAccess(gate.access.role, lead, gate.user.id);

    const parsed = leadAssignSchema.safeParse(await request.json());
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

    const updated = await assignLead(
      gate.supabase,
      gate.access.tenantId,
      id,
      parsed.data.owner_id
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
