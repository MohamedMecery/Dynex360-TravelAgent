import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertQuotationWriteAccess,
  getQuotationById,
  sendQuotation,
} from "@/lib/crm/quotations-service";
import { emitAndDispatch } from "@/lib/events/dispatch-event";
import { DOMAIN_EVENT_TYPE, buildIdempotencyKey } from "@/lib/events/types";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.send");
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
    const updated = await sendQuotation(gate.supabase, gate.access.tenantId, id);
    const sentAt = updated.sent_at ?? new Date().toISOString();

    if (updated.customer_id) {
      const admin = createAdminClient();
      const { data: customer } = await admin
        .from("customers")
        .select("name")
        .eq("id", updated.customer_id)
        .maybeSingle();

      try {
        await emitAndDispatch({
          tenantId: gate.access.tenantId,
          eventType: DOMAIN_EVENT_TYPE.QUOTATION_SENT,
          aggregateType: "quotation",
          aggregateId: id,
          customerId: updated.customer_id,
          actorType: "staff",
          actorUserId: gate.user.id,
          payload: {
            quotation_number: updated.quotation_number,
            customer_name: (customer?.name as string) ?? "Customer",
            portal_url: `/portal/quotations/${id}`,
          },
          idempotencyKey: buildIdempotencyKey(
            DOMAIN_EVENT_TYPE.QUOTATION_SENT,
            gate.access.tenantId,
            "quotation",
            id,
            sentAt
          ),
          occurredAt: sentAt,
        });
      } catch (e) {
        console.error("quotation.sent event dispatch failed:", e);
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
