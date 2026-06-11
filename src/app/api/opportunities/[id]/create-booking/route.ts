import { NextRequest, NextResponse } from "next/server";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertOpportunityWriteAccess,
  createBookingFromOpportunity,
  getOpportunityById,
} from "@/lib/crm/opportunities-service";
import { opportunityCreateBookingSchema } from "@/lib/validation/opportunity";
import { UserRole } from "@/types";

function canCreateBookings(role: UserRole): boolean {
  if (role === "super_admin" || role === "tenant_admin") return true;
  if (role === "sales_agent") return true;
  return false;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasCrmPermission(gate.access.role, "crm.opportunities.write")) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing crm.opportunities.write permission" } },
      { status: 403 }
    );
  }

  if (!canCreateBookings(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing bookings.create permission" } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const opportunity = await getOpportunityById(gate.supabase, gate.access.tenantId, id);
    assertOpportunityWriteAccess(gate.access.role, opportunity, gate.user.id);

    const body: unknown = await request.json().catch(() => ({}));
    const parsed = opportunityCreateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const adminOverride =
      new URL(request.url).searchParams.get("admin_override") === "true";
    if (
      adminOverride &&
      gate.access.role !== "tenant_admin"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Stage override is only available to tenant administrators",
          },
        },
        { status: 403 }
      );
    }

    const result = await createBookingFromOpportunity(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      id,
      parsed.data,
      { role: gate.access.role, admin_override: adminOverride }
    );

    return NextResponse.json({
      data: {
        booking_id: result.booking_id,
        reference_number: result.reference_number,
        mode: result.mode,
        redirect_url: `/bookings/edit/${result.booking_id}`,
      },
    });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
