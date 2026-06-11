"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { GatewayPaymentSummary } from "@/lib/payments/gateway-payments-query-service";

interface GatewayPaymentsPanelProps {
  fetchUrl: string;
}

export function GatewayPaymentsPanel({ fetchUrl }: GatewayPaymentsPanelProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<GatewayPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(fetchUrl, { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setData(json.data ?? { orders: [] });
    } catch {
      setError(t("payments.gateway.loadFailed"));
      setData({ orders: [] });
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("payments.gateway.title")}</CardTitle>
        </CardHeader>
        <p className="px-6 pb-6 text-sm text-muted-foreground">{t("common.loading")}</p>
      </Card>
    );
  }

  if (!data?.orders.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("payments.gateway.title")}</CardTitle>
        </CardHeader>
        <p className="px-6 pb-6 text-sm text-muted-foreground">
          {error || t("payments.gateway.empty")}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("payments.gateway.title")}</CardTitle>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {data.orders.map((order) => {
          const latestAttempt = order.attempts[0];
          return (
            <div key={order.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{t(`payments.gateway.orderType.${order.order_type}`)}</span>
                <span className="text-muted-foreground">{order.status}</span>
              </div>
              <p className="mt-1">
                {Number(order.amount).toLocaleString(undefined, {
                  style: "currency",
                  currency: order.currency,
                })}
              </p>
              {latestAttempt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("payments.gateway.providerRef")}: {latestAttempt.provider_reference} ·{" "}
                  {latestAttempt.status}
                </p>
              )}
              {order.ledger_total > 0 && (
                <p className="mt-1 text-xs">
                  {t("payments.gateway.ledgerRecorded")}: {order.ledger_total.toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
