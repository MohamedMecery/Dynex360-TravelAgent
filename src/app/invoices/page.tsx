"use client";

import Link from "next/link";
import { useCan, useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { GridActionButton } from "@/components/ui/grid-action-button";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Invoice, UserRole } from "@/types";

export default function InvoiceListPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const { data: canUpdate } = useCan({
    resource: "invoices",
    action: "update",
    params: { role: identity?.role },
  });
  const { data: canDelete } = useCan({
    resource: "invoices",
    action: "delete",
    params: { role: identity?.role },
  });
  const { data, isLoading } = useList<Invoice>({
    resource: "invoices",
    sorters: [{ field: "created_at", order: "desc" }],
    meta: { select: "*, bookings(reference_number)" },
  });
  const { mutate: softDelete } = useUpdate();
  const invoices = data?.data ?? [];

  const handleSoftDelete = (id: string) => {
    if (!confirm(t("invoices.confirmDelete"))) return;
    softDelete({
      resource: "invoices",
      id,
      values: { deleted_at: new Date().toISOString() },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("invoices.title")}</h2>
        <Link href="/invoices/create"><Button>{t("invoices.create")}</Button></Link>
      </div>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">{t("fields.invoiceNumber")}</th>
                <th className="pb-2 pr-4">{t("fields.booking")}</th>
                <th className="pb-2 pr-4">{t("bookings.total")}</th>
                <th className="pb-2 pr-4">{t("fields.status")}</th>
                <th className="pb-2 pr-4">{t("fields.dueDate")}</th>
                <th className="pb-2">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="py-2 pr-4">{inv.bookings?.reference_number ?? "—"}</td>
                  <td className="py-2 pr-4 font-medium">{formatCurrency(Number(inv.total_amount), inv.currency)}</td>
                  <td className="py-2 pr-4"><StatusBadge namespace="invoiceStatus" value={inv.status} /></td>
                  <td className="py-2 pr-4">{inv.due_date ? formatDate(inv.due_date) : "—"}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <GridActionButton href={`/invoices/show/${inv.id}`} variant="outline" size="sm">
                        {t("common.view")}
                      </GridActionButton>
                      <GridActionButton
                        href={`/invoices/edit/${inv.id}`}
                        variant="outline"
                        size="sm"
                        disabled={!canUpdate?.can}
                      >
                        {t("common.edit")}
                      </GridActionButton>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canDelete?.can}
                        onClick={() => canDelete?.can && handleSoftDelete(inv.id)}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">{t("invoices.noInvoices")}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
