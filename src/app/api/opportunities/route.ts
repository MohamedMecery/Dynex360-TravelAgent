import { NextRequest, NextResponse } from "next/server";
import {
  canReadCrmOpportunities,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { createOpportunity, listOpportunities } from "@/lib/crm/opportunities-service";
import { opportunityCreateSchema } from "@/lib/validation/opportunity";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!canReadCrmOpportunities(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.opportunities.read permission" } },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");
    const { data, total } = await listOpportunities(gate.supabase, gate.access.tenantId, {
      search: searchParams.get("search") ?? undefined,
      stage: searchParams.get("stage") ?? undefined,
      owner_id: searchParams.get("owner_id") ?? undefined,
      lead_id: searchParams.get("lead_id") ?? undefined,
      page,
      limit,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return NextResponse.json({ data, meta: { page, limit, total, totalPages } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasCrmPermission(gate.access.role, "crm.opportunities.write")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.opportunities.write permission" } },
      { status: 403 }
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = opportunityCreateSchema.safeParse(body);
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
    const opportunity = await createOpportunity(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      parsed.data
    );
    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
