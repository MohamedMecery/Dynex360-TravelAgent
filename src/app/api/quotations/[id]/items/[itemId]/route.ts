import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertQuotationWriteAccess,
  deleteQuotationItem,
  getQuotationById,
  updateQuotationItem,
} from "@/lib/crm/quotations-service";
import { quotationItemUpdateSchema } from "@/lib/validation/quotation";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.write");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id, itemId } = await params;
    const quotation = await getQuotationById(
      gate.supabase,
      gate.access.tenantId,
      id,
      false
    );
    assertQuotationWriteAccess(gate.access.role, quotation, gate.user.id);

    const body: unknown = await request.json();
    const parsed = quotationItemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid item",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const item = await updateQuotationItem(
      gate.supabase,
      gate.access.tenantId,
      id,
      itemId,
      parsed.data
    );
    return NextResponse.json({ data: item });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.write");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id, itemId } = await params;
    const quotation = await getQuotationById(
      gate.supabase,
      gate.access.tenantId,
      id,
      false
    );
    assertQuotationWriteAccess(gate.access.role, quotation, gate.user.id);
    await deleteQuotationItem(gate.supabase, gate.access.tenantId, id, itemId);
    return NextResponse.json({ data: { id: itemId } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
