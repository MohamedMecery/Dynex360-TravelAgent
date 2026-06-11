import { NextRequest, NextResponse } from "next/server";
import { hasBookingsRead } from "@/lib/auth/bookings-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import { getBookingById } from "@/lib/bookings/bookings-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
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

  try {
    const { id } = await params;
    const booking = await getBookingById(
      gate.supabase,
      gate.access.tenantId,
      id
    );
    return NextResponse.json({ data: booking });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Booking not found" } },
        { status: 404 }
      );
    }
    console.error("Booking detail error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to load booking",
        },
      },
      { status: 500 }
    );
  }
}
