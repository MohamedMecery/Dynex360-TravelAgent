import { NextRequest, NextResponse } from "next/server";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { logWhatsAppForLead } from "@/lib/crm/activities-service";
import {
  assertLeadWriteAccess,
  getLeadById,
} from "@/lib/crm/leads-service";
import { z } from "zod";

const bodySchema = z.object({
  subject: z.string().min(1).max(255).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!hasCrmPermission(gate.access.role, "crm.activities.write")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.activities.write permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const lead = await getLeadById(gate.supabase, gate.access.tenantId, id);
    assertLeadWriteAccess(gate.access.role, lead, gate.user.id);

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid body" } },
        { status: 400 }
      );
    }

    await logWhatsAppForLead(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      gate.access.role,
      id,
      parsed.data.subject ?? "WhatsApp follow-up"
    );

    const refreshed = await getLeadById(gate.supabase, gate.access.tenantId, id);
    return NextResponse.json({ data: { ok: true, lead: refreshed } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
