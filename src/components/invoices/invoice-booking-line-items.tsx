"use client";

import Link from "next/link";
import { useList } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { sumBookingItemsSubtotal } from "@/lib/invoices/booking-subtotal";
import type { BookingItem } from "@/types";

interface InvoiceBookingLineItemsProps {
  bookingId: string;
  bookingReference?: string;
  currency: string;
}

/** Read-only snapshot of `booking_items` at invoice view time (MVP — no `invoice_items` table). */
export function InvoiceBookingLineItems({
  bookingId,
  bookingReference,
  currency,
}: InvoiceBookingLineItemsProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormat();
  const { data, isLoading } = useList<BookingItem>({
    resource: "booking_items",
    filters: [{ field: "booking_id", operator: "eq", value: bookingId }],
    pagination: { pageSize: 50 },
  });

  const items = data?.data ?? [];
  const linesTotal = sumBookingItemsSubtotal(items);

  return (
    <Card data-testid="invoice-booking-line-items">
      <CardHeader>
        <CardTitle className="text-base">{t("invoices.bookingLinesSnapshot")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("invoices.bookingLinesSnapshotHint")}</p>
        {bookingReference && (
          <Link
            href={`/bookings/show/${bookingId}`}
            className="text-sm text-primary hover:underline"
          >
            {t("fields.booking")}: {bookingReference}
          </Link>
        )}
      </CardHeader>
      <div className="px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("invoices.noBookingLines")}</p>
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
                    <td className="py-2 pr-4">
                      {formatCurrency(Number(item.unit_price), currency)}
                    </td>
                    <td className="py-2">
                      {formatCurrency(Number(item.total_price), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right text-sm font-medium">
              {t("invoices.linesSubtotal")}: {formatCurrency(linesTotal, currency)}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
