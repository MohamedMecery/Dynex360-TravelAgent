import { NextRequest, NextResponse } from "next/server";
import {
  canReadCrmLeads,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { createLead, listLeads } from "@/lib/crm/leads-service";
import { leadCreateSchema } from "@/lib/validation/lead";

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
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const { data, total } = await listLeads(gate.supabase, gate.access.tenantId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      owner_id: searchParams.get("owner_id") ?? undefined,
      page,
      limit,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return NextResponse.json({
      data,
      meta: { page, limit, total, totalPages },
    });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!hasCrmPermission(gate.access.role, "crm.leads.write")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.leads.write permission" } },
      { status: 403 }
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = leadCreateSchema.safeParse(body);
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
    const { lead, exact_duplicates, possible_duplicates } = await createLead(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      parsed.data,
      { allow_duplicates: allowDuplicates }
    );
    const meta =
      exact_duplicates.length || possible_duplicates.length
        ? { exact_duplicates, possible_duplicates }
        : undefined;
    return NextResponse.json({ data: lead, meta }, { status: 201 });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
