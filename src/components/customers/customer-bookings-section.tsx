"use client";

import Link from "next/link";
import { useList } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { Booking } from "@/types";

interface CustomerBookingsSectionProps {
  customerId: string;
}

export function CustomerBookingsSection({ customerId }: CustomerBookingsSectionProps) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { data, isLoading } = useList<Booking>({
    resource: "bookings",
    filters: [
      { field: "customer_id", operator: "eq", value: customerId },
      { field: "deleted_at", operator: "null", value: null },
    ],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 20 },
    meta: { select: "*, packages(title)" },
  });

  const bookings = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("customers.bookingHistory")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("customers.noBookings")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("dashboard.reference")}</th>
                <th className="pb-2 pr-4">{t("fields.package")}</th>
                <th className="pb-2 pr-4">{t("fields.status")}</th>
                <th className="pb-2 pr-4">{t("fields.travelDate")}</th>
                <th className="pb-2 pr-4">{t("bookings.total")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{booking.reference_number}</td>
                  <td className="py-2 pr-4">{booking.packages?.title ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge namespace="bookingStatus" value={booking.status} />
                  </td>
                  <td className="py-2 pr-4">
                    {booking.travel_date ? formatDate(booking.travel_date) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {formatCurrency(Number(booking.total_amount), booking.currency)}
                  </td>
                  <td className="py-2">
                    <Link href={`/bookings/show/${booking.id}`}>
                      <Button variant="outline" size="sm">
                        {t("common.view")}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
