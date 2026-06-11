import { NextRequest, NextResponse } from "next/server";
import { canReadCustomers } from "@/lib/auth/customers-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import { fetchCustomer360 } from "@/lib/crm/customer-360-service";

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
    const payload = await fetchCustomer360(
      gate.supabase,
      gate.access.tenantId,
      id,
      gate.access.role,
      gate.user.id
    );
    return NextResponse.json(
      { data: payload },
      { headers: { "Cache-Control": "private, max-age=0" } }
    );
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
