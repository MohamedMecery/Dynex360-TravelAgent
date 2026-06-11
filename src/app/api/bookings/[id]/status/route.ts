import { NextRequest, NextResponse } from "next/server";
import { hasBookingStatusPermission } from "@/lib/auth/bookings-permissions";
import { requireActiveApiAccess } from "@/lib/auth/require-active-api-access";
import {
  BookingStatusUpdateError,
  updateBookingStatus,
} from "@/lib/bookings/update-booking-status";
import { updateBookingStatusSchema } from "@/lib/validation/booking-status";
import type { BookingStatus } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const gate = await requireActiveApiAccess();
    if (gate instanceof NextResponse) {
      return gate;
    }

    const { supabase, user, access } = gate;
    const { id } = await params;

    const parsed = updateBookingStatusSchema.safeParse(await request.json());
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

    const nextStatus = parsed.data.status as BookingStatus;
    if (!hasBookingStatusPermission(access.role, nextStatus)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Missing permission for this status change" } },
        { status: 403 }
      );
    }

    const result = await updateBookingStatus(
      supabase,
      access.tenantId,
      user.id,
      id,
      nextStatus
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof BookingStatusUpdateError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "UPDATE_FAILED"
            ? 500
            : 409;
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status }
      );
    }

    console.error("Booking status update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update booking status" } },
      { status: 500 }
    );
  }
}
