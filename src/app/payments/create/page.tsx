"use client";

import { useMemo, useState } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigation, useList, useOne } from "@refinedev/core";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { validatePaymentBookingEligibility } from "@/lib/bookings/payment-eligibility";
import { useTranslation } from "@/i18n/locale-provider";
import { Booking } from "@/types";

const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "other"] as const;

export default function PaymentCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const searchParams = useSearchParams();
  const preselectedBooking = searchParams.get("booking_id") ?? "";
  const preselectedInvoice = searchParams.get("invoice_id") ?? "";
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: bookingsData } = useList<Booking>({
    resource: "bookings",
    filters: [{ field: "status", operator: "ne", value: "cancelled" }],
    pagination: { pageSize: 100 },
    meta: { select: "id, reference_number, total_amount, payment_status, status" },
  });

  const {
    refineCore: { onFinish, formLoading },
    register,
    handleSubmit,
    watch,
  } = useForm({
    refineCoreProps: { resource: "payments", action: "create", redirect: "list" },
    defaultValues: {
      booking_id: preselectedBooking,
      invoice_id: preselectedInvoice,
      method: "bank_transfer",
      payment_date: new Date().toISOString().split("T")[0],
      amount: 0,
      reference_number: "",
    },
  });

  const selectedBookingId = watch("booking_id");
  const activeBookings = useMemo(() => bookingsData?.data ?? [], [bookingsData?.data]);

  const { data: preselectedBookingData } = useOne<Booking>({
    resource: "bookings",
    id: preselectedBooking,
    queryOptions: { enabled: Boolean(preselectedBooking) },
    meta: { select: "id, reference_number, status, total_amount" },
  });

  const preselectedIsCancelled = preselectedBookingData?.data?.status === "cancelled";

  const bookingStatusById = useMemo(() => {
    const map = new Map<string, Booking["status"]>();
    for (const booking of activeBookings) {
      map.set(booking.id, booking.status);
    }
    if (preselectedBookingData?.data) {
      map.set(preselectedBookingData.data.id, preselectedBookingData.data.status);
    }
    return map;
  }, [activeBookings, preselectedBookingData?.data]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const bookingStatus = bookingStatusById.get(values.booking_id as string);
    const eligibility = validatePaymentBookingEligibility(bookingStatus);

    if (!eligibility.ok) {
      if (eligibility.code === "cancelled") {
        setSubmitError(t("payments.cancelledBookingError"));
      } else {
        setSubmitError(t("payments.selectActiveBooking"));
      }
      return;
    }

    try {
      await onFinish(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("payments.recordError");
      if (message.toLowerCase().includes("cancelled")) {
        setSubmitError(t("payments.cancelledBookingError"));
      } else {
        setSubmitError(message);
      }
    }
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("payments.recordTitle")}</h2>
      {preselectedIsCancelled && (
        <div
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {t("payments.cancelledBookingError")}
        </div>
      )}
      <Card className="max-w-lg p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>{t("fields.booking")}</Label>
            <Select
              {...register("booking_id", { required: true })}
              disabled={preselectedIsCancelled}
            >
              <option value="">{t("fields.selectBooking")}</option>
              {activeBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.reference_number} — ${b.total_amount}
                </option>
              ))}
            </Select>
          </div>
          {preselectedInvoice && <input type="hidden" {...register("invoice_id")} />}
          <div>
            <Label>{t("fields.amount")}</Label>
            <Input
              type="number"
              step="0.01"
              {...register("amount", { required: true, valueAsNumber: true })}
              disabled={preselectedIsCancelled}
            />
          </div>
          <div>
            <Label>{t("fields.method")}</Label>
            <Select {...register("method")} disabled={preselectedIsCancelled}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`paymentMethod.${method}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("fields.referenceNumber")}</Label>
            <Input {...register("reference_number")} disabled={preselectedIsCancelled} />
          </div>
          <div>
            <Label>{t("fields.paymentDate")}</Label>
            <Input
              type="date"
              {...register("payment_date", { required: true })}
              disabled={preselectedIsCancelled}
            />
          </div>
          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={formLoading || preselectedIsCancelled || !selectedBookingId}
            >
              {formLoading ? t("payments.recording") : t("payments.record")}
            </Button>
            <Button type="button" variant="outline" onClick={() => list("payments")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
