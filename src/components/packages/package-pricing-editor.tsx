"use client";

import { useCallback, useEffect, useState } from "react";
import { useList } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenantId } from "@/lib/auth/use-tenant-id";
import { supabaseClient } from "@/lib/supabase/client";
import { PRICING_TIERS, packagePricingSchema } from "@/lib/validation/package-form";
import { useTranslation } from "@/i18n/locale-provider";
import type { PackagePricing, PricingTier } from "@/types";

interface PackagePricingEditorProps {
  packageId: string;
  readOnly?: boolean;
}

type TierAmounts = Record<PricingTier, string>;

const emptyAmounts = (): TierAmounts => ({
  adult: "",
  child: "",
  infant: "",
});

export function PackagePricingEditor({ packageId, readOnly = false }: PackagePricingEditorProps) {
  const { t } = useTranslation();
  const tenantId = useTenantId();
  const [amounts, setAmounts] = useState<TierAmounts>(emptyAmounts());
  const [currency, setCurrency] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data, isLoading, refetch } = useList<PackagePricing>({
    resource: "package_pricing",
    filters: [{ field: "package_id", operator: "eq", value: packageId }],
    pagination: { pageSize: 10 },
  });

  const pricingRows = data?.data ?? [];

  const syncFromRows = useCallback((rows: PackagePricing[]) => {
    const next = emptyAmounts();
    let nextCurrency = "USD";
    for (const row of rows) {
      next[row.tier] = String(row.amount);
      nextCurrency = row.currency;
    }
    setAmounts(next);
    setCurrency(nextCurrency);
  }, []);

  useEffect(() => {
    syncFromRows(pricingRows);
  }, [pricingRows, syncFromRows]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId || readOnly) return;

    setError(null);
    setSuccess(false);

    const parsed = packagePricingSchema.safeParse({
      adult: amounts.adult === "" ? undefined : Number(amounts.adult),
      child: amounts.child === "" ? undefined : Number(amounts.child),
      infant: amounts.infant === "" ? undefined : Number(amounts.infant),
      currency: currency.trim().toUpperCase() || "USD",
    });

    if (!parsed.success) {
      setError(t("packages.pricingInvalid"));
      return;
    }

    const { adult, child, infant, currency: validCurrency } = parsed.data;
    const tierValues: Partial<Record<PricingTier, number>> = { adult, child, infant };
    const hasAnyTier = PRICING_TIERS.some((tier) => tierValues[tier] !== undefined && tierValues[tier]! >= 0);

    if (!hasAnyTier) {
      setError(t("packages.pricingRequired"));
      return;
    }

    setSaving(true);
    try {
      for (const tier of PRICING_TIERS) {
        const amount = tierValues[tier];
        const existing = pricingRows.find((row) => row.tier === tier);

        if (amount === undefined || Number.isNaN(amount)) {
          if (existing) {
            const { error: deleteError } = await supabaseClient
              .from("package_pricing")
              .delete()
              .eq("id", existing.id);
            if (deleteError) throw deleteError;
          }
          continue;
        }

        const payload = {
          package_id: packageId,
          tenant_id: tenantId,
          tier,
          amount,
          currency: validCurrency,
        };

        if (existing) {
          const { error: updateError } = await supabaseClient
            .from("package_pricing")
            .update({ amount, currency: validCurrency })
            .eq("id", existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabaseClient.from("package_pricing").insert(payload);
          if (insertError) throw insertError;
        }
      }

      setSuccess(true);
      await refetch();
    } catch {
      setError(t("packages.pricingSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("packages.pricing")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : readOnly ? (
          pricingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("packages.noPricing")}</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {PRICING_TIERS.map((tier) => {
                const row = pricingRows.find((p) => p.tier === tier);
                if (!row) return null;
                return (
                  <div key={tier} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{t(`bookingAgent.tiers.${tier}`)}</dt>
                    <dd className="font-medium">
                      {row.currency} {Number(row.amount).toFixed(2)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("packages.pricingHint")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <div key={tier}>
                  <Label>{t(`bookingAgent.tiers.${tier}`)}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amounts[tier]}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [tier]: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
            <div className="max-w-[8rem]">
              <Label>{t("packages.currency")}</Label>
              <Input
                value={currency}
                maxLength={3}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{t("packages.pricingSaved")}</p>}
            <Button type="submit" disabled={saving || !tenantId}>
              {saving ? t("common.saving") : t("packages.savePricing")}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
