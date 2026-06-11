import { NextRequest, NextResponse } from "next/server";
import { hasBookingsRead } from "@/lib/auth/bookings-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { listBookings } from "@/lib/bookings/bookings-service";
import { bookingListQuerySchema } from "@/lib/validation/booking-api";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = await requireActiveApiAccess();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!hasBookingsRead(gate.access.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Missing bookings.read permission" } },
      { status: 403 }
    );
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = bookingListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  try {
    const { data, total } = await listBookings(
      gate.supabase,
      gate.access.tenantId,
      parsed.data
    );
    const { page, limit } = parsed.data;
    return NextResponse.json({
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Bookings list error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to list bookings",
        },
      },
      { status: 500 }
    );
  }
}
