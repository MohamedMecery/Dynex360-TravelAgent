"use client";

import { useList } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { BookingStatusHistoryEntry } from "@/types";

interface BookingStatusHistorySectionProps {
  bookingId: string;
}

export function BookingStatusHistorySection({ bookingId }: BookingStatusHistorySectionProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const { data, isLoading } = useList<BookingStatusHistoryEntry>({
    resource: "booking_status_history",
    filters: [{ field: "booking_id", operator: "eq", value: bookingId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 50 },
  });

  const entries = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bookings.statusHistory")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bookings.noStatusHistory")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("bookings.fromStatus")}</th>
                <th className="pb-2 pr-4">{t("bookings.toStatus")}</th>
                <th className="pb-2">{t("dashboard.date")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td className="py-2 pr-4">
                    {entry.from_status ? (
                      <StatusBadge namespace="bookingStatus" value={entry.from_status} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge namespace="bookingStatus" value={entry.to_status} />
                  </td>
                  <td className="py-2">{formatDate(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
