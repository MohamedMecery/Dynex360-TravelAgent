"use client";

import { useForm } from "@refinedev/react-hook-form";
import { useNavigation } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";

const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "cancelled", "void"] as const;

export default function InvoiceEditPage() {
  const { t } = useTranslation();
  const { list } = useNavigation();

  const { refineCore: { onFinish, formLoading, queryResult }, register, handleSubmit, watch } = useForm({
    refineCoreProps: { resource: "invoices", action: "edit", redirect: "list" },
  });

  const invoice = queryResult?.data?.data;
  const subtotal = Number(watch("subtotal")) || 0;
  const taxAmount = Number(watch("tax_amount")) || 0;

  const onSubmit = handleSubmit((values) => {
    const sub = Number(values.subtotal) || 0;
    const tax = Number(values.tax_amount) || 0;
    return onFinish({
      ...values,
      subtotal: sub,
      tax_amount: tax,
      total_amount: sub + tax,
      due_date: values.due_date || null,
      notes: values.notes || null,
    } as never);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("invoices.editTitle")}</h2>
      <Card className="max-w-lg p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle>{invoice?.invoice_number ?? t("common.loading")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("fields.issueDate")}</Label><Input type="date" {...register("issue_date")} /></div>
            <div><Label>{t("fields.dueDate")}</Label><Input type="date" {...register("due_date")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("fields.subtotal")}</Label><Input type="number" step="0.01" {...register("subtotal", { valueAsNumber: true })} /></div>
            <div><Label>{t("fields.tax")}</Label><Input type="number" step="0.01" {...register("tax_amount", { valueAsNumber: true })} /></div>
          </div>
          <div className="text-sm text-muted-foreground">{t("bookings.total")}: {(subtotal + taxAmount).toFixed(2)}</div>
          <div>
            <Label>{t("fields.status")}</Label>
            <Select {...register("status")}>
              {INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>{t(`invoiceStatus.${status}`)}</option>
              ))}
            </Select>
          </div>
          <div><Label>{t("common.notes")}</Label><Textarea {...register("notes")} /></div>
          <div className="flex gap-2">
            <Button type="submit" disabled={formLoading}>{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => list("invoices")}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
