"use client";

import { useShow, useUpdate } from "@refinedev/core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordMetadata } from "@/components/shared/record-metadata";
import { withAuditUserSelect } from "@/lib/audit/record-metadata";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { InvoiceBookingLineItems } from "@/components/invoices/invoice-booking-line-items";
import { Invoice } from "@/types";

export default function InvoiceShowPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { queryResult } = useShow<Invoice>({
    resource: "invoices",
    meta: {
      select: withAuditUserSelect("invoices", "*, bookings(reference_number, customer_id, total_amount)"),
    },
  });
  const { mutate: updateOne } = useUpdate();
  const invoice = queryResult?.data?.data;
  if (!invoice) return <p>{t("common.loading")}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{invoice.invoice_number}</h2>
          <StatusBadge namespace="invoiceStatus" value={invoice.status} />
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button onClick={() => updateOne({ resource: "invoices", id: invoice.id, values: { status: "issued" } })}>
              {t("invoices.issue")}
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "void" && invoice.status !== "cancelled" && (
            <Link href={`/payments/create?booking_id=${invoice.booking_id}&invoice_id=${invoice.id}`}>
              <Button variant="outline">{t("invoices.recordPayment")}</Button>
            </Link>
          )}
          <Link href={`/invoices/edit/${invoice.id}`}><Button>{t("common.edit")}</Button></Link>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Card className="p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>{t("common.details")}</CardTitle></CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2"><dt className="font-medium w-28">{t("fields.booking")}:</dt><dd>
            {invoice.bookings?.reference_number ? (
              <Link href={`/bookings/show/${invoice.booking_id}`} className="text-primary hover:underline">
                {invoice.bookings.reference_number}
              </Link>
            ) : (
              "—"
            )}
          </dd></div>
          <div className="flex gap-2"><dt className="font-medium w-28">{t("fields.issueDate")}:</dt><dd>{invoice.issue_date ? formatDate(invoice.issue_date) : "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-28">{t("fields.dueDate")}:</dt><dd>{invoice.due_date ? formatDate(invoice.due_date) : "—"}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-28">{t("fields.subtotal")}:</dt><dd>{formatCurrency(Number(invoice.subtotal), invoice.currency)}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-28">{t("fields.tax")}:</dt><dd>{formatCurrency(Number(invoice.tax_amount), invoice.currency)}</dd></div>
          <div className="flex gap-2"><dt className="font-medium w-28">{t("bookings.total")}:</dt><dd className="font-bold">{formatCurrency(Number(invoice.total_amount), invoice.currency)}</dd></div>
          {invoice.notes && <div><dt className="font-medium mb-1">{t("common.notes")}:</dt><dd className="text-muted-foreground">{invoice.notes}</dd></div>}
        </dl>
        <RecordMetadata {...invoice} className="mt-4" />
      </Card>

      <InvoiceBookingLineItems
        bookingId={invoice.booking_id}
        bookingReference={invoice.bookings?.reference_number}
        currency={invoice.currency}
      />
      </div>
    </div>
  );
}
