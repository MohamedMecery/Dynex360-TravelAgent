"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useList, useNavigation } from "@refinedev/core";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { apiCreateQuotation } from "@/lib/crm/quotations-api-client";
import { useTranslation } from "@/i18n/locale-provider";
import type { Opportunity, QuotationItemType } from "@/types";

interface LineRow {
  item_type: QuotationItemType;
  description: string;
  quantity: string;
  unit_price: string;
}

interface QuotationForm {
  opportunity_id: string;
  currency: string;
  valid_until: string;
  notes: string;
  discount_amount: string;
  tax_amount: string;
}

const ITEM_TYPES: QuotationItemType[] = [
  "package",
  "hotel",
  "flight",
  "visa",
  "transport",
  "insurance",
  "other",
];

export default function QuotationCreatePage() {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetOpportunityId = searchParams.get("opportunity_id") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<LineRow[]>([
    { item_type: "other", description: "", quantity: "1", unit_price: "0" },
  ]);

  const { data: oppData } = useList<Opportunity>({
    resource: "opportunities",
    filters: [{ field: "deleted_at", operator: "null", value: null }],
    pagination: { pageSize: 200 },
  });
  const opportunities = useMemo(() => oppData?.data ?? [], [oppData?.data]);

  const selectedOpp = useMemo(
    () => opportunities.find((o) => o.id === presetOpportunityId),
    [opportunities, presetOpportunityId]
  );

  const { register, handleSubmit, watch } = useForm<QuotationForm>({
    defaultValues: {
      opportunity_id: presetOpportunityId,
      currency: selectedOpp?.currency ?? "USD",
      valid_until: "",
      notes: "",
      discount_amount: "0",
      tax_amount: "0",
    },
  });

  const opportunityId = watch("opportunity_id");
  const linkedOpp = useMemo(
    () => opportunities.find((o) => o.id === opportunityId),
    [opportunities, opportunityId]
  );

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    const items = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        item_type: l.item_type,
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      }));
    if (items.length === 0) {
      setError(t("quotations.itemsRequired"));
      setSaving(false);
      return;
    }
    try {
      const quotation = await apiCreateQuotation({
        opportunity_id: values.opportunity_id,
        currency: values.currency,
        valid_until: values.valid_until || null,
        notes: values.notes || null,
        discount_amount: Number(values.discount_amount) || 0,
        tax_amount: Number(values.tax_amount) || 0,
        customer_id: linkedOpp?.customer_id ?? undefined,
        items,
      });
      router.push(`/crm/quotations/show/${quotation.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("leads.createError"));
    } finally {
      setSaving(false);
    }
  });

  function updateLine(index: number, patch: Partial<LineRow>): void {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addLine(): void {
    setLines((prev) => [
      ...prev,
      { item_type: "other", description: "", quantity: "1", unit_price: "0" },
    ]);
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold">{t("quotations.createTitle")}</h2>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t("quotations.details")}</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-6 pb-6">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("nav.opportunities")}
            </label>
            <Select {...register("opportunity_id", { required: true })}>
              <option value="">{t("common.select")}</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.opportunity_number}
                  {o.destination_text ? ` — ${o.destination_text}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("leads.currency")}</label>
              <Input {...register("currency")} maxLength={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("quotations.validUntil")}
              </label>
              <Input type="date" {...register("valid_until")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("quotations.discount")}
              </label>
              <Input type="number" min={0} step="0.01" {...register("discount_amount")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("quotations.tax")}</label>
              <Input type="number" min={0} step="0.01" {...register("tax_amount")} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("common.notes")}</label>
            <Input {...register("notes")} />
          </div>

          <div className="space-y-3 border-t pt-4">
            <p className="font-medium">{t("quotations.lineItems")}</p>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded border p-3 md:grid-cols-4">
                <Select
                  value={line.item_type}
                  onChange={(e) =>
                    updateLine(index, {
                      item_type: e.target.value as QuotationItemType,
                    })
                  }
                >
                  {ITEM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`quotations.itemType.${type}`)}
                    </option>
                  ))}
                </Select>
                <Input
                  className="md:col-span-2"
                  placeholder={t("quotations.description")}
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    placeholder={t("quotations.qty")}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder={t("quotations.unitPrice")}
                    value={line.unit_price}
                    onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addLine}>
              {t("quotations.addLine")}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !opportunityId}>
              {saving ? t("common.creating") : t("common.create")}
            </Button>
            <Button type="button" variant="outline" onClick={() => list("quotations")}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
