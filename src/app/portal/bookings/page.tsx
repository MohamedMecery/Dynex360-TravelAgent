"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { PortalBookingListItem } from "@/lib/portal/portal-bookings-service";

export default function PortalBookingsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortalBookingListItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/bookings")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
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
      <h1 className="text-2xl font-bold">{t("portal.bookings.title")}</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("portal.bookings.empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/portal/bookings/${b.id}`} className="font-semibold text-primary hover:underline">
                    {b.reference_number}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {(b.packages as { title?: string } | null)?.title ?? "—"}
                  </p>
                  {b.travel_date && (
                    <p className="text-xs text-muted-foreground">
                      {t("portal.bookings.travelDate")}: {new Date(b.travel_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-end">
                  <StatusBadge namespace="bookingStatus" value={b.status} />
                  <p className="mt-1 text-sm font-medium">
                    {b.total_amount.toLocaleString(undefined, {
                      style: "currency",
                      currency: b.currency,
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
