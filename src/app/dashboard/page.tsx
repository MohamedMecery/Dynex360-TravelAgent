"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { DashboardStats } from "@/lib/dashboard/stats";
import type { BookingStatus, UserRole } from "@/types";

export default function DashboardPage() {
  const { t, dir } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const role = identity?.role;

  const { data: canViewFinancial } = useCan({
    resource: "dashboard",
    action: "financial",
    params: { role },
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dashboard/stats");
        const body = (await response.json()) as {
          data?: DashboardStats;
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(body.error?.message ?? t("dashboard.loadError"));
        }

        if (!cancelled && body.data) {
          setStats(body.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("dashboard.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const statusCounts = stats?.bookings_by_status ?? {
    draft: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  };
  const recentBookings = stats?.recent_bookings ?? [];
  const showFinancial = Boolean(canViewFinancial?.can) && stats?.total_revenue != null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("dashboard.title")}</h2>

      {error && (
        <div
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(["draft", "confirmed", "completed", "cancelled"] as const).map((status) => (
          <Link key={status} href={`/bookings?status=${status}`} className="block transition-opacity hover:opacity-90">
            <Card>
              <CardHeader>
                <p className="text-sm text-muted-foreground">{t(`bookingStatus.${status}`)}</p>
                <p className="text-3xl font-bold">
                  {loading ? "—" : (statusCounts[status as BookingStatus] ?? 0)}
                </p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {showFinancial && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.totalRevenue")}</CardTitle>
              <p className="text-3xl font-bold text-green-600">
                {loading ? "—" : formatCurrency(stats?.total_revenue ?? 0)}
              </p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.outstandingBalance")}</CardTitle>
              <p className="text-3xl font-bold text-orange-600">
                {loading ? "—" : formatCurrency(stats?.outstanding_balance ?? 0)}
              </p>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("dashboard.recentBookings")}</CardTitle>
          <Link href="/bookings" className="text-sm text-primary hover:underline">
            {t("nav.bookings")}
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir={dir}>
            <thead>
              <tr className="border-b text-start">
                <th className="px-4 pb-2">{t("dashboard.reference")}</th>
                <th className="px-4 pb-2">{t("dashboard.status")}</th>
                <th className="px-4 pb-2">{t("dashboard.payment")}</th>
                <th className="px-4 pb-2">{t("dashboard.total")}</th>
                <th className="px-4 pb-2">{t("dashboard.date")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/bookings/show/${booking.id}`}
                        className="text-primary hover:underline"
                      >
                        {booking.reference_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge namespace="bookingStatus" value={booking.status} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge namespace="paymentStatus" value={booking.payment_status} />
                    </td>
                    <td className="px-4 py-2">{formatCurrency(Number(booking.total_amount))}</td>
                    <td className="px-4 py-2">{formatDate(booking.created_at)}</td>
                  </tr>
                ))}
              {!loading && recentBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    {t("dashboard.noBookings")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
