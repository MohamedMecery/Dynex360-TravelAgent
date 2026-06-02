"use client";

import { useState } from "react";
import { useCan, useGetIdentity, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import {
  canCancelBooking,
  canCompleteBooking,
  canConfirmBooking,
  validateBookingStatusTransition,
} from "@/lib/bookings/status-transitions";
import { useTranslation } from "@/i18n/locale-provider";
import { useToast } from "@/providers/toast-provider";
import type { BookingStatus, UserRole } from "@/types";

interface BookingStatusActionsProps {
  bookingId: string;
  status: BookingStatus;
  onStatusChange?: () => void;
  size?: "sm" | "md";
  variant?: "inline" | "toolbar";
}

export function BookingStatusActions({
  bookingId,
  status,
  onStatusChange,
  size = "md",
  variant = "toolbar",
}: BookingStatusActionsProps) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const role = identity?.role;
  const { mutate: updateOne, isLoading } = useUpdate();
  const [error, setError] = useState<string | null>(null);

  const { data: canConfirm } = useCan({
    resource: "bookings",
    action: "confirm",
    params: { role },
  });
  const { data: canComplete } = useCan({
    resource: "bookings",
    action: "complete",
    params: { role },
  });
  const { data: canCancel } = useCan({
    resource: "bookings",
    action: "cancel",
    params: { role },
  });

  const resolveTransitionError = (code: string): string => {
    if (code === "terminal_status") return t("bookings.statusTerminalError");
    if (code === "invalid_transition") return t("bookings.statusTransitionError");
    return t("bookings.statusUpdateError");
  };

  const successMessageForStatus = (nextStatus: BookingStatus): string => {
    if (nextStatus === "confirmed") return t("bookings.statusConfirmedSuccess");
    if (nextStatus === "completed") return t("bookings.statusCompletedSuccess");
    if (nextStatus === "cancelled") return t("bookings.statusCancelledSuccess");
    return t("bookings.statusUpdateSuccess");
  };

  const applyStatus = (nextStatus: BookingStatus) => {
    setError(null);
    const check = validateBookingStatusTransition(status, nextStatus);
    if (!check.ok) {
      const message = resolveTransitionError(check.code);
      setError(message);
      toastError(message);
      return;
    }

    updateOne(
      { resource: "bookings", id: bookingId, values: { status: nextStatus } },
      {
        onSuccess: () => {
          setError(null);
          success(successMessageForStatus(nextStatus));
          onStatusChange?.();
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : t("bookings.statusUpdateError");
          const displayMessage =
            message.toLowerCase().includes("cancelled") || message.includes("transition")
              ? t("bookings.statusTransitionError")
              : message;
          setError(displayMessage);
          toastError(displayMessage);
        },
      }
    );
  };

  const confirmWithDialog = (messageKey: string, nextStatus: BookingStatus) => {
    if (!window.confirm(t(messageKey))) return;
    applyStatus(nextStatus);
  };

  const showConfirm = Boolean(canConfirm?.can) && canConfirmBooking(status);
  const showComplete = Boolean(canComplete?.can) && canCompleteBooking(status);
  const showCancel = Boolean(canCancel?.can) && canCancelBooking(status);

  if (!showConfirm && !showComplete && !showCancel) {
    return null;
  }

  const buttonSize = size === "sm" ? "sm" : undefined;

  return (
    <div className={variant === "inline" ? "space-y-2" : undefined}>
      <div className="flex flex-wrap gap-2">
        {showConfirm && (
          <Button
            size={buttonSize}
            onClick={() => confirmWithDialog("bookings.confirmBookingMessage", "confirmed")}
            disabled={isLoading}
          >
            {t("bookings.confirm")}
          </Button>
        )}
        {showComplete && (
          <Button
            size={buttonSize}
            onClick={() => confirmWithDialog("bookings.completeBookingMessage", "completed")}
            disabled={isLoading}
          >
            {t("bookings.complete")}
          </Button>
        )}
        {showCancel && (
          <Button
            size={buttonSize}
            variant="destructive"
            onClick={() => confirmWithDialog("bookings.cancelConfirmMessage", "cancelled")}
            disabled={isLoading}
          >
            {t("bookings.cancelBooking")}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
