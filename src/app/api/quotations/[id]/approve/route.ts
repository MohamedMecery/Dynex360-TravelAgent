import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { approveQuotation, getQuotationById } from "@/lib/crm/quotations-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.approve");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    await getQuotationById(gate.supabase, gate.access.tenantId, id, false);
    const updated = await approveQuotation(
      gate.supabase,
      gate.access.tenantId,
      id,
      gate.user.id
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
