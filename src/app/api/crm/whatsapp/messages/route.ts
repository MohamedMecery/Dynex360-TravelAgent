import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const gate = await requireCrmApiAccess("crm.whatsapp.messages.read");
  if (gate instanceof NextResponse) return gate;

  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customer_id");
    const quotationId = url.searchParams.get("quotation_id");
    const bookingId = url.searchParams.get("booking_id");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    const admin = createAdminClient();
    let q = admin
      .from("whatsapp_messages")
      .select("*")
      .eq("tenant_id", gate.access.tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (customerId) q = q.eq("customer_id", customerId);
    if (quotationId) q = q.eq("quotation_id", quotationId);
    if (bookingId) q = q.eq("booking_id", bookingId);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
