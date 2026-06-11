"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PortalPaymentReceiptPlaceholder } from "@/components/portal/portal-quotation-pay-button";
import { useTranslation } from "@/i18n/locale-provider";
import type { PaymentAttemptRecord, PaymentOrderRecord } from "@/lib/payments/types";

export default function PortalPaymentOrderPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PaymentOrderRecord | null>(null);
  const [attempts, setAttempts] = useState<PaymentAttemptRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/payment-orders/${params.id}`);
      if (res.status === 404) throw new Error("not_found");
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      setOrder(json.data.order);
      setAttempts(json.data.attempts ?? []);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "not_found"
          ? t("portal.payments.orderNotFound")
          : t("portal.errors.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (order?.status === "processing" || order?.status === "pending") {
        void load();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [load, order?.status]);

  const simulateMockPayment = async () => {
    if (!order) return;
    setSimulating(true);
    try {
      const amountCents = Math.round(Number(order.amount) * 100);
      const res = await fetch("/api/webhooks/paymob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRANSACTION",
          obj: {
            id: `mock-${Date.now()}`,
            success: true,
            amount_cents: amountCents,
            currency: order.currency,
            order: { merchant_order_id: order.id, id: attempts[0]?.provider_reference ?? order.id },
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? t("portal.payments.simulateFailed"));
        return;
      }
      await load();
    } catch {
      setError(t("portal.payments.simulateFailed"));
    } finally {
      setSimulating(false);
    }
  };

  const mockEnabled = process.env.NEXT_PUBLIC_PAYMOB_MOCK_MODE === "true";

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (error || !order) return <p className="text-red-600">{error}</p>;

  const latestAttempt = attempts[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/quotations" className="text-sm text-primary hover:underline">
          ← {t("portal.quotations.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{t("portal.payments.checkoutStatus")}</h1>
      </div>

      <Card className="p-4">
        <p className="text-sm text-muted-foreground">{t("portal.payments.status")}</p>
        <p className="text-lg font-semibold capitalize">{order.status}</p>
        <p className="mt-2 text-xl font-bold">
          {Number(order.amount).toLocaleString(undefined, {
            style: "currency",
            currency: order.currency,
          })}
        </p>
        {latestAttempt && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("portal.payments.providerRef")}: {latestAttempt.provider_reference}
          </p>
        )}
      </Card>

      {(order.status === "pending" || order.status === "processing") && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t("portal.payments.awaitingPayment")}</p>
          {mockEnabled && (
            <Button className="mt-3" variant="outline" onClick={simulateMockPayment} disabled={simulating}>
              {simulating ? t("common.loading") : t("portal.payments.simulatePayment")}
            </Button>
          )}
        </Card>
      )}

      <PortalPaymentReceiptPlaceholder orderId={order.id} status={order.status} />

      {order.status === "completed" && order.booking_id && (
        <Link href={`/portal/bookings/${order.booking_id}`}>
          <Button>{t("portal.payments.viewBooking")}</Button>
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("portal.payments.attemptHistory")}</CardTitle>
        </CardHeader>
        <ul className="space-y-2 px-6 pb-6 text-sm">
          {attempts.map((a) => (
            <li key={a.id} className="border-b py-2">
              <span className="capitalize">{a.status}</span> — {a.provider_reference}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
