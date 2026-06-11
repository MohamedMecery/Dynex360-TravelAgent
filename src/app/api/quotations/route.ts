import { NextRequest, NextResponse } from "next/server";
import { canReadCrmQuotations } from "@/lib/auth/crm-rbac";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { createQuotation, listQuotations } from "@/lib/crm/quotations-service";
import { quotationCreateSchema } from "@/lib/validation/quotation";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.read");
  if (gate instanceof NextResponse) return gate;
  if (!canReadCrmQuotations(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.quotations.read permission" } },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const { data, total } = await listQuotations(gate.supabase, gate.access.tenantId, {
      opportunity_id: searchParams.get("opportunity_id") ?? undefined,
      customer_id: searchParams.get("customer_id") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      owner_id: searchParams.get("owner_id") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "20"),
    });
    const limit = Number(searchParams.get("limit") ?? "20");
    const page = Number(searchParams.get("page") ?? "1");
    return NextResponse.json({
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.write");
  if (gate instanceof NextResponse) return gate;

  try {
    const body: unknown = await request.json();
    const parsed = quotationCreateSchema.safeParse(body);
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
    const quotation = await createQuotation(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      parsed.data
    );
    return NextResponse.json({ data: quotation }, { status: 201 });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
