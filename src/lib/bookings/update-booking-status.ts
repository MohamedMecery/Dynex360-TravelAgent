import { SupabaseClient } from "@supabase/supabase-js";
import { sendBookingConfirmationEmail } from "@/lib/email/notifications/booking-confirmation";
import {
  validateBookingStatusTransition,
  type BookingTransitionErrorCode,
} from "@/lib/bookings/status-transitions";
import type { BookingStatus } from "@/types";

export class BookingStatusUpdateError extends Error {
  constructor(
    message: string,
    public readonly code: BookingTransitionErrorCode | "NOT_FOUND" | "UPDATE_FAILED"
  ) {
    super(message);
    this.name = "BookingStatusUpdateError";
  }
}

export interface UpdateBookingStatusResult {
  id: string;
  status: BookingStatus;
  previous_status: BookingStatus;
  email_sent?: boolean;
}

export async function updateBookingStatus(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  bookingId: string,
  nextStatus: BookingStatus
): Promise<UpdateBookingStatusResult> {
  const { data: existing, error: loadError } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadError) {
    throw new BookingStatusUpdateError(loadError.message, "UPDATE_FAILED");
  }

  if (!existing) {
    throw new BookingStatusUpdateError("Booking not found", "NOT_FOUND");
  }

  const previousStatus = existing.status as BookingStatus;
  const check = validateBookingStatusTransition(previousStatus, nextStatus);
  if (!check.ok) {
    throw new BookingStatusUpdateError("Invalid status transition", check.code);
  }

  const { data: updated, error: updateError } = await supabase
    .from("bookings")
    .update({ status: nextStatus, updated_by: userId })
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .select("id, status")
    .single();

  if (updateError || !updated) {
    throw new BookingStatusUpdateError(
      updateError?.message ?? "Failed to update booking",
      "UPDATE_FAILED"
    );
  }

  let emailSent = false;
  if (nextStatus === "confirmed" && previousStatus !== "confirmed") {
    const emailResult = await sendBookingConfirmationEmail(supabase, {
      tenantId,
      bookingId,
    });
    emailSent = emailResult.status === "sent";
  }

  return {
    id: updated.id,
    status: updated.status as BookingStatus,
    previous_status: previousStatus,
    email_sent: emailSent,
  };
}
