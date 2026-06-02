"use client";

import { useEffect, useMemo, useState } from "react";
import { buildPricingLineItems, getPackagePricing } from "@/lib/ai/booking-tools";
import { supabaseClient } from "@/lib/supabase/client";
import type { BookingTravelerRowValues } from "@/lib/validation/booking-form";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingPricingPreviewProps {
  packageId: string;
  packageTitle: string;
  travelers: BookingTravelerRowValues[];
}

export function BookingPricingPreview({
  packageId,
  packageTitle,
  travelers,
}: BookingPricingPreviewProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormat();
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);

  const validTravelers = useMemo(
    () =>
      travelers.filter(
        (row) => row.first_name.trim() && row.last_name.trim()
      ),
    [travelers]
  );

  const [pricing, setPricing] = useState<
    { tier: string; amount: number; currency: string }[]
  >([]);

  useEffect(() => {
    if (!packageId) {
      setPricing([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getPackagePricing(supabaseClient, packageId).then((rows) => {
      if (cancelled) return;
      setPricing(rows);
      setCurrency(rows[0]?.currency ?? "USD");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  const lineItems = useMemo(() => {
    if (!packageId || validTravelers.length === 0 || pricing.length === 0) return [];
    return buildPricingLineItems(
      packageTitle,
      validTravelers.map((row) => ({
        first_name: row.first_name,
        last_name: row.last_name,
        tier: row.tier,
      })),
      pricing.map((p) => ({
        tier: p.tier as "adult" | "child" | "infant",
        amount: p.amount,
        currency: p.currency,
      }))
    );
  }, [packageId, packageTitle, validTravelers, pricing]);

  const total = lineItems.reduce((sum, item) => sum + item.total_price, 0);

  if (!packageId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bookings.lineItems")}</CardTitle>
      </CardHeader>
      <div className="px-6 pb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : pricing.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bookings.noPackagePricing")}</p>
        ) : validTravelers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bookings.addTravelerForPricing")}</p>
        ) : lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("bookings.pricingTierMissing")}</p>
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
                {lineItems.map((item) => (
                  <tr key={item.tier} className="border-b">
                    <td className="py-2 pr-4">{item.description}</td>
                    <td className="py-2 pr-4">{item.quantity}</td>
                    <td className="py-2 pr-4">{formatCurrency(item.unit_price, currency)}</td>
                    <td className="py-2">{formatCurrency(item.total_price, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right text-lg font-bold">
              {t("bookings.total")}: {formatCurrency(total, currency)}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
