import { NextRequest, NextResponse } from "next/server";
import { canReadCrmLeads } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { checkLeadDuplicates } from "@/lib/crm/leads-service";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const { searchParams } = new URL(request.url);
    const data = await checkLeadDuplicates(gate.supabase, gate.access.tenantId, {
      email: searchParams.get("email"),
      mobile: searchParams.get("mobile"),
      whatsapp: searchParams.get("whatsapp"),
      exclude_id: searchParams.get("exclude_id") ?? undefined,
    });
    return NextResponse.json({
      data: {
        exact: data.exact,
        possible: data.possible,
      },
    });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
