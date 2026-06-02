"use client";

import { useList } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { BookingItem } from "@/types";

interface BookingItemsSectionProps {
  bookingId: string;
}

export function BookingItemsSection({ bookingId }: BookingItemsSectionProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormat();
  const { data, isLoading } = useList<BookingItem>({
    resource: "booking_items",
    filters: [{ field: "booking_id", operator: "eq", value: bookingId }],
    pagination: { pageSize: 50 },
  });

  const items = data?.data ?? [];
  const total = items.reduce((sum, item) => sum + Number(item.total_price), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bookings.lineItems")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bookings.noLineItems")}</p>
        ) : (
          <>
            <table className="mb-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4">{t("fields.description")}</th>
                  <th className="pb-2 pr-4">{t("bookings.qty")}</th>
                  <th className="pb-2 pr-4">{t("bookings.unitPrice")}</th>
                  <th className="pb-2">{t("bookings.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className="py-2 pr-4">{formatCurrency(Number(item.unit_price))}</td>
                    <td className="py-2">{formatCurrency(Number(item.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-bold">
              {t("bookings.total")}: {formatCurrency(total)}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
