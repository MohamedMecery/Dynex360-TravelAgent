"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { PortalQuotationListItem } from "@/lib/portal/portal-quotations-service";

export default function PortalQuotationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortalQuotationListItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/quotations")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((json) => setItems(json.data ?? []))
      .catch(() => setError(t("portal.errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("portal.quotations.title")}</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("portal.quotations.empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/portal/quotations/${q.id}`} className="font-semibold text-primary hover:underline">
                    {q.quotation_number}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {t("portal.quotations.validUntil")}:{" "}
                    {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="text-end">
                  <StatusBadge namespace="quotationStatus" value={q.status} />
                  <p className="mt-1 text-sm font-medium">
                    {q.total_amount.toLocaleString(undefined, {
                      style: "currency",
                      currency: q.currency,
                    })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
