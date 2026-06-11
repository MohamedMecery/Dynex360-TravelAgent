import { NextRequest, NextResponse } from "next/server";
import { requireCrmApiAccess, crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertQuotationWriteAccess,
  convertQuotationToBooking,
  getQuotationById,
} from "@/lib/crm/quotations-service";
import { UserRole } from "@/types";

function canCreateBookings(role: UserRole): boolean {
  return role === "super_admin" || role === "tenant_admin" || role === "sales_agent";
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireCrmApiAccess("crm.quotations.convert");
  if (gate instanceof NextResponse) return gate;

  if (!canCreateBookings(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing bookings.create permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const quotation = await getQuotationById(
      gate.supabase,
      gate.access.tenantId,
      id,
      false
    );
    assertQuotationWriteAccess(gate.access.role, quotation, gate.user.id);

    const result = await convertQuotationToBooking(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      id
    );

    return NextResponse.json({
      data: {
        quotation: result.quotation,
        booking: {
          id: result.booking_id,
          reference_number: result.reference_number,
        },
        redirect_url: `/bookings/edit/${result.booking_id}`,
      },
    });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
