"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/locale-provider";

interface PortalQuotationPayButtonProps {
  quotationId: string;
  status: string;
}

export function PortalQuotationPayButton({
  quotationId,
  status,
}: PortalQuotationPayButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status !== "accepted") return null;

  const startCheckout = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/quotations/${quotationId}/checkout`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message ?? t("portal.payments.checkoutFailed"));
        return;
      }
      const orderId = body?.data?.payment_order?.id;
      const checkoutUrl = body?.data?.checkout_url;
      if (orderId) {
        router.push(`/portal/payment-orders/${orderId}`);
      } else if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch {
      setError(t("portal.payments.checkoutFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="mb-3 text-sm text-muted-foreground">{t("portal.payments.payPrompt")}</p>
      <Button onClick={startCheckout} disabled={loading}>
        {loading ? t("portal.payments.starting") : t("portal.payments.payNow")}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface PortalPaymentReceiptPlaceholderProps {
  orderId: string;
  status: string;
}

export function PortalPaymentReceiptPlaceholder({
  orderId,
  status,
}: PortalPaymentReceiptPlaceholderProps) {
  const { t } = useTranslation();

  if (status !== "completed") return null;

  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <p>{t("portal.payments.receiptPlaceholder")}</p>
      <p className="mt-1 font-mono text-xs">{orderId}</p>
      <Link href="/portal/bookings" className="mt-2 inline-block text-primary hover:underline">
        {t("portal.payments.viewBookings")}
      </Link>
    </div>
  );
}
