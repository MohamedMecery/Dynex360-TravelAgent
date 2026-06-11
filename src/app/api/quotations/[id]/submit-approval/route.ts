import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertQuotationWriteAccess,
  getQuotationById,
  submitQuotationApproval,
} from "@/lib/crm/quotations-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.write");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    const quotation = await getQuotationById(
      gate.supabase,
      gate.access.tenantId,
      id,
      false
    );
    assertQuotationWriteAccess(gate.access.role, quotation, gate.user.id);
    const updated = await submitQuotationApproval(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
