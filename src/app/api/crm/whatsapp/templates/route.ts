import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireCrmApiAccess("crm.whatsapp.templates.manage");
  if (gate instanceof NextResponse) return gate;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("whatsapp_templates")
      .select("*")
      .eq("tenant_id", gate.access.tenantId)
      .order("internal_name")
      .order("language");

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireCrmApiAccess("crm.whatsapp.templates.manage");
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("whatsapp_templates")
      .insert({
        tenant_id: gate.access.tenantId,
        internal_name: String(body.internal_name ?? ""),
        meta_template_name: String(body.meta_template_name ?? ""),
        language: body.language === "ar" ? "ar" : "en",
        category: String(body.category ?? "UTILITY"),
        meta_status: body.meta_status ?? "pending",
        body_preview: (body.body_preview as string) ?? null,
        variable_count: Number(body.variable_count ?? 0),
        event_type: (body.event_type as string) ?? null,
        is_active: body.is_active !== false,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
