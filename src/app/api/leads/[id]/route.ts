import { NextRequest, NextResponse } from "next/server";
import {
  canReadCrmLeads,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertLeadWriteAccess,
  getLeadById,
  softDeleteLead,
  updateLead,
} from "@/lib/crm/leads-service";
import { leadUpdateSchema } from "@/lib/validation/lead";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
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
    return NextResponse.json({ data: lead });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function PATCH(
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

    const body: unknown = await request.json();
    const parsed = leadUpdateSchema.safeParse(body);
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

    const allowDuplicates =
      new URL(request.url).searchParams.get("allow_duplicates") === "true";
    const { lead: updated, exact_duplicates, possible_duplicates } = await updateLead(
      gate.supabase,
      gate.access.tenantId,
      id,
      parsed.data,
      { allow_duplicates: allowDuplicates }
    );
    const meta =
      exact_duplicates.length || possible_duplicates.length
        ? { exact_duplicates, possible_duplicates }
        : undefined;
    return NextResponse.json({ data: updated, meta });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
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
    await softDeleteLead(gate.supabase, gate.access.tenantId, id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
