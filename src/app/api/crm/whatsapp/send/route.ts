import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { ManualWhatsAppSendService } from "@/lib/whatsapp/manual-send-service";

export async function POST(request: NextRequest) {
  const gate = await requireCrmApiAccess("crm.whatsapp.messages.send");
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const customerId = String(body.customer_id ?? "");
    const templateId = String(body.template_id ?? "");
    const bodyVariables = Array.isArray(body.body_variables)
      ? body.body_variables.map(String)
      : [];

    if (!customerId || !templateId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "customer_id and template_id required" } },
        { status: 400 }
      );
    }

    const service = new ManualWhatsAppSendService();
    const message = await service.send({
      tenantId: gate.access.tenantId,
      customerId,
      templateId,
      bodyVariables,
      initiatedByUserId: gate.user.id,
      quotationId: (body.quotation_id as string) ?? null,
      bookingId: (body.booking_id as string) ?? null,
    });

    return NextResponse.json({ data: message });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
