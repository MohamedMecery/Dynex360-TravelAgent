import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  addQuotationItem,
  assertQuotationWriteAccess,
  getQuotationById,
} from "@/lib/crm/quotations-service";
import { quotationItemCreateSchema } from "@/lib/validation/quotation";

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

    const body: unknown = await request.json();
    const parsed = quotationItemCreateSchema.safeParse(body);
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

    const item = await addQuotationItem(
      gate.supabase,
      gate.access.tenantId,
      id,
      parsed.data
    );
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
