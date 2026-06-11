import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertQuotationWriteAccess,
  getQuotationById,
  rejectQuotation,
} from "@/lib/crm/quotations-service";
import { quotationRejectSchema } from "@/lib/validation/quotation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
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
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = quotationRejectSchema.safeParse(body);
    const updated = await rejectQuotation(
      gate.supabase,
      gate.access.tenantId,
      id,
      parsed.success ? parsed.data.reason : undefined
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
