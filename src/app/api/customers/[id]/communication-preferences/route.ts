import { NextRequest, NextResponse } from "next/server";
import {
  canReadCustomers,
  hasCustomersPermission,
} from "@/lib/auth/customers-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  getCustomerCommunicationPreferences,
  upsertCustomerCommunicationPreferences,
} from "@/lib/whatsapp/preferences-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppTemplateLanguage } from "@/lib/whatsapp/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;
  if (!canReadCustomers(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing customers.read permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const admin = createAdminClient();
    const prefs = await getCustomerCommunicationPreferences(
      admin,
      gate.access.tenantId,
      id
    );
    return NextResponse.json({ data: prefs });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;
  if (!hasCustomersPermission(gate.access.role, "customers.update")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing customers.update permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const admin = createAdminClient();
    const prefs = await upsertCustomerCommunicationPreferences(
      admin,
      gate.access.tenantId,
      id,
      {
        preferred_language: body.preferred_language as WhatsAppTemplateLanguage | undefined,
        whatsapp_opt_in:
          typeof body.whatsapp_opt_in === "boolean" ? body.whatsapp_opt_in : undefined,
        quiet_hours_start:
          body.quiet_hours_start === null
            ? null
            : (body.quiet_hours_start as string | undefined),
        quiet_hours_end:
          body.quiet_hours_end === null
            ? null
            : (body.quiet_hours_end as string | undefined),
        quiet_hours_timezone: body.quiet_hours_timezone as string | undefined,
      }
    );
    return NextResponse.json({ data: prefs });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
