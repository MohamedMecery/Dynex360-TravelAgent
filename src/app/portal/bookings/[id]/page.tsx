"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PortalBookingDocuments } from "@/components/portal/portal-booking-documents";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { PortalBookingDetail } from "@/lib/portal/portal-bookings-service";

export default function PortalBookingDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<PortalBookingDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/portal/bookings/${params.id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error("not_found");
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((json) => setBooking(json.data))
      .catch((err) =>
        setError(err.message === "not_found" ? t("portal.bookings.notFound") : t("portal.errors.loadFailed"))
      )
      .finally(() => setLoading(false));
  }, [params.id, t]);

  if (loading) return <p className="text-muted-foreground">{t("common.loading")}</p>;
  if (error || !booking) return <p className="text-red-600">{error}</p>;

  const packageInfo = booking.packages as {
    title?: string;
    destinations?: { name?: string } | null;
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/portal/bookings" className="text-sm text-primary hover:underline">
            ← {t("portal.bookings.back")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{booking.reference_number}</h1>
          <p className="text-muted-foreground">{packageInfo?.title ?? "—"}</p>
        </div>
        <StatusBadge namespace="bookingStatus" value={booking.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("portal.bookings.travelDate")}</p>
          <p className="font-medium">
            {booking.travel_date ? new Date(booking.travel_date).toLocaleDateString() : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("portal.bookings.destination")}</p>
          <p className="font-medium">{packageInfo?.destinations?.name ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("portal.bookings.total")}</p>
          <p className="text-lg font-bold">
            {booking.total_amount.toLocaleString(undefined, { style: "currency", currency: booking.currency })}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("portal.bookings.travelers")}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {booking.booking_travelers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="divide-y">
              {booking.booking_travelers.map((bt) => {
                const traveler = bt.travelers as {
                  first_name?: string;
                  last_name?: string;
                } | null;
                const name = [traveler?.first_name, traveler?.last_name].filter(Boolean).join(" ") || "—";
                return (
                  <li key={bt.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{name}</span>
                    <span className="text-muted-foreground">
                      {bt.is_lead ? t("portal.bookings.leadTraveler") : t(`pricingTier.${bt.price_tier}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <PortalBookingDocuments bookingId={booking.id} />

      <Card>
        <CardHeader>
          <CardTitle>{t("portal.bookings.history")}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {booking.booking_status_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="space-y-3">
              {booking.booking_status_history.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <StatusBadge namespace="bookingStatus" value={entry.to_status} />
                    {entry.notes && <p className="mt-1 text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
