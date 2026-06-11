import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertQuotationWriteAccess,
  getQuotationById,
  softDeleteQuotation,
  updateQuotation,
} from "@/lib/crm/quotations-service";
import { quotationUpdateSchema } from "@/lib/validation/quotation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.read");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    const quotation = await getQuotationById(
      gate.supabase,
      gate.access.tenantId,
      id,
      true
    );
    return NextResponse.json({ data: quotation });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function PATCH(
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

    const body: unknown = await request.json();
    const parsed = quotationUpdateSchema.safeParse(body);
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

    const updated = await updateQuotation(
      gate.supabase,
      gate.access.tenantId,
      id,
      parsed.data,
      gate.access.role
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
    await softDeleteQuotation(gate.supabase, gate.access.tenantId, id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
