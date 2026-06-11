"use client";

import { useState } from "react";
import { useCan, useGetIdentity } from "@refinedev/core";
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
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        const body = (await response.json()) as { error?: { message?: string } };

        if (!response.ok) {
          throw new Error(body.error?.message ?? t("bookings.statusUpdateError"));
        }

        setError(null);
        success(successMessageForStatus(nextStatus));
        onStatusChange?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : t("bookings.statusUpdateError");
        const displayMessage =
          message.toLowerCase().includes("cancelled") || message.includes("transition")
            ? t("bookings.statusTransitionError")
            : message;
        setError(displayMessage);
        toastError(displayMessage);
      } finally {
        setLoading(false);
      }
    })();
  };

  const confirmWithDialog = (messageKey: string, nextStatus: BookingStatus) => {
    if (!window.confirm(t(messageKey))) return;
    applyStatus(nextStatus);
  };

  const showConfirm = Boolean(canConfirm?.can) && canConfirmBooking(status);
  const showComplete = Boolean(canComplete?.can) && canCompleteBooking(status);
  const showCancel = Boolean(canCancel?.can) && canCancelBooking(status);

  const buttonSize = size === "sm" ? "sm" : undefined;
  const alwaysShow = variant === "inline";

  if (!alwaysShow && !showConfirm && !showComplete && !showCancel) {
    return null;
  }

  return (
    <div className={variant === "inline" ? "contents" : undefined}>
      <div className={variant === "inline" ? "contents" : "flex flex-wrap gap-2"}>
        {(alwaysShow || showConfirm) && (
          <Button
            size={buttonSize}
            onClick={() => confirmWithDialog("bookings.confirmBookingMessage", "confirmed")}
            disabled={loading || !showConfirm}
          >
            {t("bookings.confirm")}
          </Button>
        )}
        {(alwaysShow || showComplete) && (
          <Button
            size={buttonSize}
            onClick={() => confirmWithDialog("bookings.completeBookingMessage", "completed")}
            disabled={loading || !showComplete}
          >
            {t("bookings.complete")}
          </Button>
        )}
        {(alwaysShow || showCancel) && (
          <Button
            size={buttonSize}
            variant="destructive"
            onClick={() => confirmWithDialog("bookings.cancelConfirmMessage", "cancelled")}
            disabled={loading || !showCancel}
          >
            {t("bookings.cancelBooking")}
          </Button>
        )}
      </div>
      {error && variant !== "inline" && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
