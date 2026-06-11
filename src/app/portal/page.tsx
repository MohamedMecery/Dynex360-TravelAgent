"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import type { PortalDashboardData } from "@/lib/portal/portal-dashboard-service";

export default function PortalDashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PortalDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/dashboard")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? "Failed to load dashboard");
        }
        return res.json();
      })
      .then((json) => setData(json.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error || !data) {
    return <p className="text-red-600" role="alert">{error || t("portal.errors.loadFailed")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("portal.dashboard.title")}</h1>
        <p className="text-muted-foreground">
          {t("portal.dashboard.welcome")}, {data.customer.display_name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t("portal.dashboard.openQuotations")}
            </CardTitle>
            <p className="text-3xl font-bold">{data.open_quotations_count}</p>
          </CardHeader>
          <Link href="/portal/quotations" className="block px-6 pb-4 text-sm text-primary hover:underline">
            {t("portal.dashboard.viewQuotations")}
          </Link>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              {t("portal.dashboard.activeBookings")}
            </CardTitle>
            <p className="text-3xl font-bold">{data.active_bookings_count}</p>
          </CardHeader>
          <Link href="/portal/bookings" className="block px-6 pb-4 text-sm text-primary hover:underline">
            {t("portal.dashboard.viewBookings")}
          </Link>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("portal.dashboard.recentActivity")}</CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
          ) : (
            <ul className="divide-y">
              {data.recent_activity.map((item) => (
                <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t(`portal.activity.${item.type}`)} ·{" "}
                      {new Date(item.occurred_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge
                    namespace={item.type === "quotation" ? "quotationStatus" : "bookingStatus"}
                    value={item.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
