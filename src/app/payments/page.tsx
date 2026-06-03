"use client";

import Link from "next/link";
import { useCan, useGetIdentity, useList } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { GridActionButton } from "@/components/ui/grid-action-button";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Payment, UserRole } from "@/types";

export default function PaymentListPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canCreate } = useCan({
    resource: "payments",
    action: "create",
    params: { role: identity?.role },
  });
  const { data, isLoading } = useList<Payment>({
    resource: "payments",
    sorters: [{ field: "payment_date", order: "desc" }],
    meta: { select: "*, bookings(reference_number)" },
  });
  const payments = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("payments.title")}</h2>
        {canCreate?.can !== false && (
          <Link href="/payments/create"><Button>{t("payments.record")}</Button></Link>
        )}
      </div>
      <Card>
        {isLoading ? <p>{t("common.loading")}</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("fields.booking")}</th>
                <th className="pb-2 pr-4">{t("fields.amount")}</th>
                <th className="pb-2 pr-4">{t("fields.method")}</th>
                <th className="pb-2 pr-4">{t("dashboard.reference")}</th>
                <th className="pb-2 pr-4">{t("dashboard.date")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{p.bookings?.reference_number ?? p.booking_id.slice(0, 8)}</td>
                  <td className="py-2 pr-4 font-medium">{formatCurrency(Number(p.amount))}</td>
                  <td className="py-2 pr-4"><StatusBadge namespace="paymentMethod" value={p.method} /></td>
                  <td className="py-2 pr-4">{p.reference_number ?? "—"}</td>
                  <td className="py-2 pr-4">{formatDate(p.payment_date)}</td>
                  <td className="py-2">
                    <GridActionButton href={`/payments/show/${p.id}`} variant="outline" size="sm">
                      {t("common.view")}
                    </GridActionButton>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">{t("payments.noPayments")}</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
