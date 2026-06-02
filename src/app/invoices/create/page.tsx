"use client";

import { useEffect } from "react";
import { useForm } from "@refinedev/react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import { useTranslation } from "@/i18n/locale-provider";
import { Booking } from "@/types";

export default function InvoiceCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const tenantId = useTenantId();
  const searchParams = useSearchParams();
  const preselectedBooking = searchParams.get("booking_id") ?? "";

  const { data: bookingsData } = useList<Booking>({
    resource: "bookings",
    filters: [{ field: "status", operator: "ne", value: "cancelled" }],
    pagination: { pageSize: 100 },
    meta: { select: "id, reference_number, total_amount, currency" },
  });

  const { refineCore: { onFinish, formLoading }, register, handleSubmit, watch, setValue } = useForm({
    refineCoreProps: { resource: "invoices", action: "create", redirect: "list" },
    defaultValues: {
      booking_id: preselectedBooking,
      status: "draft",
      currency: "USD",
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "",
      notes: "",
      invoice_number: "",
    },
  });

  const subtotal = Number(watch("subtotal")) || 0;
  const taxAmount = Number(watch("tax_amount")) || 0;
  const bookingId = watch("booking_id");

  useEffect(() => {
    if (!bookingId || !bookingsData?.data) return;
    const booking = bookingsData.data.find((b) => b.id === bookingId);
    if (booking) {
      setValue("subtotal", Number(booking.total_amount));
      setValue("currency", booking.currency);
    }
  }, [bookingId, bookingsData?.data, setValue]);

  const onBookingChange = (id: string) => {
    const booking = (bookingsData?.data ?? []).find((b) => b.id === id);
    if (booking) {
      setValue("subtotal", Number(booking.total_amount));
      setValue("currency", booking.currency);
    }
  };

  const onSubmit = handleSubmit((values) => {
    if (!tenantId) return;
    const sub = Number(values.subtotal) || 0;
    const tax = Number(values.tax_amount) || 0;
    return onFinish({
      ...values,
      tenant_id: tenantId,
      subtotal: sub,
      tax_amount: tax,
      total_amount: sub + tax,
      due_date: values.due_date || null,
      notes: values.notes || null,
      invoice_number: "",
    } as never);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("invoices.createTitle")}</h2>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{t("invoices.details")}</CardTitle></CardHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>{t("fields.booking")}</Label>
            <Select
              {...register("booking_id", { required: true })}
              onChange={(e) => {
                void register("booking_id").onChange(e);
                onBookingChange(e.target.value);
              }}
            >
              <option value="">{t("fields.selectBooking")}</option>
              {(bookingsData?.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.reference_number} — {b.currency} {b.total_amount}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("fields.issueDate")}</Label><Input type="date" {...register("issue_date")} /></div>
            <div><Label>{t("fields.dueDate")}</Label><Input type="date" {...register("due_date")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("fields.subtotal")}</Label><Input type="number" step="0.01" {...register("subtotal", { valueAsNumber: true })} /></div>
            <div><Label>{t("fields.tax")}</Label><Input type="number" step="0.01" {...register("tax_amount", { valueAsNumber: true })} /></div>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("bookings.total")}: {(subtotal + taxAmount).toFixed(2)} {watch("currency")}
          </div>
          <div>
            <Label>{t("fields.status")}</Label>
            <Select {...register("status")}>
              <option value="draft">{t("invoiceStatus.draft")}</option>
              <option value="issued">{t("invoiceStatus.issued")}</option>
            </Select>
          </div>
          <div><Label>{t("common.notes")}</Label><Textarea {...register("notes")} /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={formLoading || !tenantId}>{formLoading ? t("common.creating") : t("invoices.create")}</Button>
            <Button type="button" variant="outline" onClick={() => list("invoices")}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
