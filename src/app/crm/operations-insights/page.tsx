"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { OpsInsightsPayload } from "@/lib/operations-ai/types";

type PeriodKey = "month" | "quarter";

export default function OperationsInsightsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [data, setData] = useState<OpsInsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/operations/insights?period=${period}`);
      const body = (await res.json()) as {
        data?: OpsInsightsPayload;
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(body.error?.message ?? t("opsAi.loadError"));
      setData(body.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("opsAi.loadError"));
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("opsAi.insightsTitle")}</h2>
        <div className="flex gap-2">
          {(["month", "quarter"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                period === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => setPeriod(key)}
            >
              {t(`crmDashboard.period.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi title={t("opsAi.atRiskBookings")} value={String(data.at_risk_bookings_count)} />
            <Kpi title={t("opsAi.departures7d")} value={String(data.departures_7d_count)} />
            <Kpi title={t("opsAi.paymentGaps")} value={String(data.payment_gaps_pre_departure)} />
            <Kpi
              title={t("opsAi.openRecommendations")}
              value={String(data.open_recommendations_count)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("opsAi.readinessSummary")}</CardTitle>
              </CardHeader>
              <ul className="space-y-2 px-6 pb-6 text-sm">
                {data.readiness_summary.map((row) => (
                  <li key={row.status} className="flex justify-between capitalize">
                    <span>{row.status.replace(/_/g, " ")}</span>
                    <span className="font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("opsAi.actionBacklog")}</CardTitle>
              </CardHeader>
              <ul className="space-y-2 px-6 pb-6 text-sm">
                <li className="flex justify-between">
                  <span>{t("opsAi.missingDocuments")}</span>
                  <span className="font-medium">{data.missing_documents_count}</span>
                </li>
                <li className="flex justify-between">
                  <span>{t("opsAi.travelerActions")}</span>
                  <span className="font-medium">{data.traveler_actions_count}</span>
                </li>
                <li className="flex justify-between">
                  <span>{t("opsAi.voucherBacklog")}</span>
                  <span className="font-medium">{data.voucher_backlog_count}</span>
                </li>
              </ul>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("opsAi.upcomingDepartures")}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto px-6 pb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">{t("bookings.reference")}</th>
                    <th className="py-2">{t("fields.travelDate")}</th>
                    <th className="py-2">{t("opsAi.health")}</th>
                    <th className="py-2">{t("opsAi.readiness")}</th>
                    <th className="py-2">{t("opsAi.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming_departures.map((row) => (
                    <tr key={row.booking_id} className="border-b">
                      <td className="py-2">
                        <Link
                          href={`/bookings/show/${row.booking_id}`}
                          className="text-primary hover:underline"
                        >
                          {row.reference_number}
                        </Link>
                      </td>
                      <td className="py-2">{row.travel_date}</td>
                      <td className="py-2">{row.health_score ?? "—"}</td>
                      <td className="py-2">
                        {row.readiness_score != null ? `${row.readiness_score}%` : "—"}
                      </td>
                      <td className="py-2 capitalize">
                        {row.operational_status?.replace(/_/g, " ") ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-sm text-muted-foreground">
            <Link href="/crm/dashboard" className="underline">
              {t("nav.crmDashboard")}
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
