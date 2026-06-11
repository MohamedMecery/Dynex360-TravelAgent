import { NextRequest, NextResponse } from "next/server";
import {
  canReadCrmActivities,
  hasCrmPermission,
} from "@/lib/auth/crm-rbac";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  createActivity,
  listActivities,
  listActivityTimelineEvents,
  scopeActivityListParams,
} from "@/lib/crm/activities-service";
import {
  activityCreateSchema,
  activityListViewSchema,
} from "@/lib/validation/activity";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const { searchParams } = new URL(request.url);
    const viewRaw = searchParams.get("view") ?? "timeline";
    const viewParsed = activityListViewSchema.safeParse(viewRaw);
    const view = viewParsed.success ? viewParsed.data : "timeline";
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "20");

    const scoped = scopeActivityListParams(gate.access.role, gate.user.id, {
      view,
      lead_id: searchParams.get("lead_id") ?? undefined,
      opportunity_id: searchParams.get("opportunity_id") ?? undefined,
      customer_id: searchParams.get("customer_id") ?? undefined,
      assigned_to: searchParams.get("assigned_to") ?? undefined,
      page,
      limit,
    });

    if (view === "timeline") {
      const { data, total } = await listActivityTimelineEvents(
        gate.supabase,
        gate.access.tenantId,
        scoped
      );
      return NextResponse.json({
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          view,
          format: "timeline_events",
        },
      });
    }

    const { data, total } = await listActivities(
      gate.supabase,
      gate.access.tenantId,
      scoped
    );

    return NextResponse.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        view,
        format: "activities",
      },
    });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) return gate;

  if (!hasCrmPermission(gate.access.role, "crm.activities.write")) {
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
    const body: unknown = await request.json();
    const parsed = activityCreateSchema.safeParse(body);
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

    const activity = await createActivity(
      gate.supabase,
      gate.access.tenantId,
      gate.user.id,
      gate.access.role,
      parsed.data
    );
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
