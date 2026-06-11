"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DownloadQuotationPdfButton } from "@/components/portal/download-quotation-pdf-button";
import { PortalQuotationActions } from "@/components/portal/portal-quotation-actions";
import { PortalQuotationPayButton } from "@/components/portal/portal-quotation-pay-button";
import { PortalQuotationTimeline } from "@/components/portal/portal-quotation-timeline";
import { useTranslation } from "@/i18n/locale-provider";
import type { PortalQuotationDetail } from "@/lib/portal/portal-quotations-service";
import type { PortalQuotationTimelineEvent } from "@/lib/portal/portal-quotation-timeline-service";

export default function PortalQuotationDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<PortalQuotationDetail | null>(null);
  const [timeline, setTimeline] = useState<PortalQuotationTimelineEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadQuotation = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    try {
      const [detailRes, timelineRes] = await Promise.all([
        fetch(`/api/portal/quotations/${params.id}`),
        fetch(`/api/portal/quotations/${params.id}/timeline`),
      ]);
      if (detailRes.status === 404) throw new Error("not_found");
      if (!detailRes.ok) throw new Error("failed");
      const detailJson = await detailRes.json();
      setQuotation(detailJson.data);

      if (timelineRes.ok) {
        const timelineJson = await timelineRes.json();
        setTimeline(timelineJson.data ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === "not_found"
          ? t("portal.quotations.notFound")
          : t("portal.errors.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

  useEffect(() => {
    void loadQuotation();
  }, [loadQuotation]);

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (error || !quotation) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/portal/quotations" className="text-sm text-primary hover:underline">
            ← {t("portal.quotations.back")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{quotation.quotation_number}</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge namespace="quotationStatus" value={quotation.status} />
          <DownloadQuotationPdfButton
            quotationId={quotation.id}
            quotationNumber={quotation.quotation_number}
          />
        </div>
      </div>

      <PortalQuotationActions
        quotationId={quotation.id}
        status={quotation.status}
        onUpdated={loadQuotation}
      />

      <PortalQuotationPayButton quotationId={quotation.id} status={quotation.status} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("portal.quotations.validUntil")}</p>
          <p className="font-medium">
            {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("portal.quotations.subtotal")}</p>
          <p className="font-medium">
            {quotation.subtotal.toLocaleString(undefined, { style: "currency", currency: quotation.currency })}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("portal.quotations.total")}</p>
          <p className="text-lg font-bold">
            {quotation.total_amount.toLocaleString(undefined, { style: "currency", currency: quotation.currency })}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("portal.timeline.title")}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <PortalQuotationTimeline events={timeline} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("portal.quotations.items")}</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 pe-4">{t("portal.quotations.itemDescription")}</th>
                <th className="py-2 pe-4">{t("portal.quotations.itemType")}</th>
                <th className="py-2 pe-4">{t("portal.quotations.qty")}</th>
                <th className="py-2 pe-4">{t("portal.quotations.unitPrice")}</th>
                <th className="py-2 text-end">{t("portal.quotations.lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pe-4">{item.description}</td>
                  <td className="py-2 pe-4">{t(`quotationItemType.${item.item_type}`)}</td>
                  <td className="py-2 pe-4">{item.quantity}</td>
                  <td className="py-2 pe-4">
                    {item.unit_price.toLocaleString(undefined, { style: "currency", currency: quotation.currency })}
                  </td>
                  <td className="py-2 text-end">
                    {item.line_total.toLocaleString(undefined, { style: "currency", currency: quotation.currency })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {quotation.terms_and_conditions && (
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">{t("portal.quotations.terms")}</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.terms_and_conditions}</p>
        </Card>
      )}
    </div>
  );
}
