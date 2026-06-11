import { NextRequest, NextResponse } from "next/server";
import {
  canReadCrmActivities,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  assertActivityWriteAccess,
  getActivityById,
  softDeleteActivity,
  updateActivity,
} from "@/lib/crm/activities-service";
import { activityUpdateSchema } from "@/lib/validation/activity";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!canReadCrmActivities(gate.access.role)) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Missing crm.activities.read permission",
        },
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const activity = await getActivityById(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    return NextResponse.json({ data: activity });
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

  if (
    !hasCrmPermission(gate.access.role, "crm.activities.write") &&
    !hasCrmPermission(gate.access.role, "crm.activities.write_all")
  ) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Missing crm.activities.write permission",
        },
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = activityUpdateSchema.safeParse(body);
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

    const existing = await getActivityById(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    assertActivityWriteAccess(gate.access.role, existing, gate.user.id);

    const updated = await updateActivity(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      gate.access.role,
      id,
      parsed.data
    );
    return NextResponse.json({ data: updated });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (
    !hasCrmPermission(gate.access.role, "crm.activities.write") &&
    !hasCrmPermission(gate.access.role, "crm.activities.write_all")
  ) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Missing crm.activities.write permission",
        },
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const existing = await getActivityById(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    assertActivityWriteAccess(gate.access.role, existing, gate.user.id);
    await softDeleteActivity(gate.supabase, gate.access.tenantId, id);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
