"use client";

import { useList } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { BookingTravelerRow } from "@/types";

interface BookingTravelersSectionProps {
  bookingId: string;
}

export function BookingTravelersSection({ bookingId }: BookingTravelersSectionProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useList<BookingTravelerRow>({
    resource: "booking_travelers",
    filters: [{ field: "booking_id", operator: "eq", value: bookingId }],
    sorters: [{ field: "is_lead", order: "desc" }],
    pagination: { pageSize: 50 },
    meta: { select: "*, travelers(first_name, last_name)" },
  });

  const rows = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bookings.travelers")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bookings.noTravelers")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("fields.name")}</th>
                <th className="pb-2 pr-4">{t("bookingAgent.tier")}</th>
                <th className="pb-2">{t("bookings.lead")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4">
                    {row.travelers
                      ? `${row.travelers.first_name} ${row.travelers.last_name}`
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">{t(`bookingAgent.tiers.${row.price_tier}`)}</td>
                  <td className="py-2">{row.is_lead ? t("bookings.leadYes") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
