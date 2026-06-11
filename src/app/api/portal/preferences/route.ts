import { NextResponse } from "next/server";
import { requirePortalApiAccess } from "@/lib/auth/require-portal-api-access";
import {
  getCustomerCommunicationPreferences,
  upsertCustomerCommunicationPreferences,
} from "@/lib/whatsapp/preferences-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppTemplateLanguage } from "@/lib/whatsapp/types";

export async function GET() {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const admin = createAdminClient();
    const prefs = await getCustomerCommunicationPreferences(
      admin,
      ctx.tenantId,
      ctx.customerId
    );
    return NextResponse.json({
      data: prefs ?? {
        preferred_language: "en",
        whatsapp_opt_in_at: null,
        whatsapp_opt_out_at: null,
        quiet_hours_start: null,
        quiet_hours_end: null,
        quiet_hours_timezone: "Africa/Cairo",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load preferences";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const ctx = await requirePortalApiAccess();
  if (ctx instanceof NextResponse) return ctx;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const prefs = await upsertCustomerCommunicationPreferences(
      admin,
      ctx.tenantId,
      ctx.customerId,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update preferences";
    return NextResponse.json(
      { error: { code: "INTERNAL", message } },
      { status: 500 }
    );
  }
}
