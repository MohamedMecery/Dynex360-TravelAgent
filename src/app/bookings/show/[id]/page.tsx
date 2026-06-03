"use client";

import { useShow } from "@refinedev/core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingItemsSection } from "@/components/bookings/booking-items-section";
import { BookingTravelersSection } from "@/components/bookings/booking-travelers-section";
import { BookingStatusHistorySection } from "@/components/bookings/booking-status-history-section";
import { BookingStatusActions } from "@/components/bookings/booking-status-actions";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { RecordMetadata } from "@/components/shared/record-metadata";
import { canRecordPaymentForBookingStatus } from "@/lib/bookings/payment-eligibility";
import { withAuditUserSelect } from "@/lib/audit/record-metadata";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Booking } from "@/types";

export default function BookingShowPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { queryResult } = useShow<Booking>({
    resource: "bookings",
    meta: {
      select: withAuditUserSelect(
        "bookings",
        "*, customers(first_name, last_name, email), packages(title, destinations(name))"
      ),
    },
  });
  const booking = queryResult?.data?.data;
  if (!booking) return <p>{t("common.loading")}</p>;

  const isDraft = booking.status === "draft";
  const canRecordPayment = canRecordPaymentForBookingStatus(booking.status);

  return (
    <div className="space-y-6">
      <PageBreadcrumbs
        items={[
          { label: t("nav.bookings"), href: "/bookings" },
          { label: booking.reference_number },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{booking.reference_number}</h2>
          <div className="mt-2 flex gap-2">
            <StatusBadge namespace="bookingStatus" value={booking.status} />
            <StatusBadge namespace="paymentStatus" value={booking.payment_status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Link href={`/bookings/edit/${booking.id}`}>
              <Button variant="outline">{t("common.edit")}</Button>
            </Link>
          )}
          {canRecordPayment && (
            <>
              <Link href={`/payments/create?booking_id=${booking.id}`}>
                <Button>{t("bookings.recordPayment")}</Button>
              </Link>
              <Link href={`/invoices/create?booking_id=${booking.id}`}>
                <Button variant="outline">{t("bookings.createInvoice")}</Button>
              </Link>
            </>
          )}
          <BookingStatusActions
            bookingId={booking.id}
            status={booking.status}
            onStatusChange={() => void queryResult?.refetch()}
          />
        </div>
      </div>

      {booking.status === "cancelled" && (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {t("bookings.cancelledNotice")}
        </div>
      )}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t("common.details")}</CardTitle>
        </CardHeader>
        <dl className="space-y-2 px-6 pb-6 text-sm">
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.customer")}:</dt>
            <dd>
              {booking.customers
                ? `${booking.customers.first_name} ${booking.customers.last_name}`
                : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.package")}:</dt>
            <dd>{booking.packages?.title ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("fields.travelDate")}:</dt>
            <dd>{booking.travel_date ? formatDate(booking.travel_date) : "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 font-medium">{t("bookings.total")}:</dt>
            <dd className="font-bold">{formatCurrency(Number(booking.total_amount), booking.currency)}</dd>
          </div>
          {booking.notes && (
            <div>
              <dt className="mb-1 font-medium">{t("common.notes")}:</dt>
              <dd className="text-muted-foreground">{booking.notes}</dd>
            </div>
          )}
        </dl>
        <div className="px-6 pb-6">
          <RecordMetadata {...booking} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BookingTravelersSection bookingId={booking.id} />
        <BookingItemsSection bookingId={booking.id} />
      </div>

      <BookingStatusHistorySection bookingId={booking.id} />
    </div>
  );
}
