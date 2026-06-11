import { NextRequest, NextResponse } from "next/server";
import { canReadCustomers } from "@/lib/auth/customers-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { crmApiErrorResponse } from "@/lib/api/require-crm-access";
import {
  getCustomerById,
  listCustomerTimeline,
  parseTimelineLimit,
} from "@/lib/crm/customer-360-service";
import type { TimelineBucket } from "@/lib/crm/timeline-events";
import { customer360TimelineQuerySchema } from "@/lib/validation/customer-360";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
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
    const customer = await getCustomerById(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    if (!customer) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Customer not found" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = customer360TimelineQuerySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      bucket: searchParams.get("bucket") ?? searchParams.get("timeline_bucket") ?? undefined,
    });

    const limit = parseTimelineLimit(
      parsed.success ? parsed.data.limit : undefined
    );
    const cursor = parsed.success ? parsed.data.cursor : undefined;
    const bucket = (parsed.success ? parsed.data.bucket : "all") ?? "all";

    const page = await listCustomerTimeline(
      gate.supabase,
      gate.access.tenantId,
      id,
      {
        limit,
        cursor: cursor ?? null,
        bucket: bucket as TimelineBucket,
      }
    );

    return NextResponse.json(
      { data: page.data, meta: page.meta },
      { headers: { "Cache-Control": "private, max-age=0" } }
    );
  } catch (error) {
    return crmApiErrorResponse(error);
  }
}
