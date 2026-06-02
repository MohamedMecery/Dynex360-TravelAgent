"use client";

import { useShow } from "@refinedev/core";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Payment } from "@/types";

export default function PaymentShowPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { queryResult } = useShow<Payment>({
    resource: "payments",
    meta: { select: "*, bookings(reference_number, total_amount)" },
  });
  const payment = queryResult?.data?.data;
  if (!payment) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("payments.details")}</h2>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{formatCurrency(Number(payment.amount))}</CardTitle></CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.booking")}:</dt><dd className="font-mono">{payment.bookings?.reference_number ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.method")}:</dt><dd><StatusBadge namespace="paymentMethod" value={payment.method} /></dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("fields.referenceNumber")}:</dt><dd>{payment.reference_number ?? "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-32">{t("dashboard.date")}:</dt><dd>{formatDate(payment.payment_date)}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
