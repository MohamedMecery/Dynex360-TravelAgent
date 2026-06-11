import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.whatsapp.templates.manage");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const admin = createAdminClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.meta_status) patch.meta_status = body.meta_status;
    if (body.is_active !== undefined) patch.is_active = body.is_active;
    if (body.body_preview !== undefined) patch.body_preview = body.body_preview;
    if (body.variable_count !== undefined) patch.variable_count = body.variable_count;
    if (body.event_type !== undefined) patch.event_type = body.event_type;

    const { data, error } = await admin
      .from("whatsapp_templates")
      .update(patch)
      .eq("id", id)
      .eq("tenant_id", gate.access.tenantId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.whatsapp.templates.manage");
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin
      .from("whatsapp_templates")
      .delete()
      .eq("id", id)
      .eq("tenant_id", gate.access.tenantId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
