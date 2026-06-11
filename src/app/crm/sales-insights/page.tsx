"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { SalesInsightsPayload } from "@/lib/sales-ai/types";

type PeriodKey = "month" | "quarter";

export default function SalesInsightsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [data, setData] = useState<SalesInsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/sales/insights?period=${period}`);
      const body = (await res.json()) as {
        data?: SalesInsightsPayload;
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(body.error?.message ?? t("salesAi.loadError"));
      setData(body.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("salesAi.loadError"));
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
        <h2 className="text-2xl font-bold">{t("salesAi.insightsTitle")}</h2>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi title={t("salesAi.acceptanceRate")} value={fmtPct(data.acceptance_rate)} />
            <Kpi title={t("salesAi.paymentConversion")} value={fmtPct(data.payment_conversion)} />
            <Kpi
              title={t("salesAi.openRecommendations")}
              value={String(data.open_recommendations_count)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FunnelCard title={t("salesAi.leadFunnel")} items={data.lead_funnel} keyField="stage" />
            <FunnelCard
              title={t("salesAi.quotationFunnel")}
              items={data.quotation_funnel}
              keyField="status"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankCard
              title={t("salesAi.topPackages")}
              items={data.top_packages.map((p) => ({
                label: p.package_name,
                count: p.count,
              }))}
            />
            <RankCard
              title={t("salesAi.topDestinations")}
              items={data.top_destinations.map((d) => ({
                label: d.destination,
                count: d.count,
              }))}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("salesAi.lostReasons")}</CardTitle>
            </CardHeader>
            <ul className="space-y-2 px-6 pb-6 text-sm">
              {data.lost_reasons.map((r) => (
                <li key={r.reason} className="flex justify-between">
                  <span>{r.reason}</span>
                  <span className="font-medium">{r.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("salesAi.repLeaderboard")}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto px-6 pb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">{t("salesAi.rep")}</th>
                    <th className="py-2">{t("salesAi.won")}</th>
                    <th className="py-2">{t("salesAi.revenue")}</th>
                    <th className="py-2">{t("salesAi.openOpps")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rep_leaderboard.map((rep) => (
                    <tr key={rep.owner_id} className="border-b">
                      <td className="py-2">{rep.owner_name}</td>
                      <td className="py-2">{rep.won_count}</td>
                      <td className="py-2">{rep.won_revenue}</td>
                      <td className="py-2">{rep.open_count}</td>
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

function FunnelCard({
  title,
  items,
  keyField,
}: {
  title: string;
  items: { [k: string]: string | number }[];
  keyField: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <ul className="space-y-2 px-6 pb-6 text-sm">
        {items.map((item) => (
          <li key={String(item[keyField])} className="flex justify-between">
            <span>{String(item[keyField])}</span>
            <span className="font-medium">{item.count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RankCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <ul className="space-y-2 px-6 pb-6 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex justify-between">
            <span>{item.label}</span>
            <span className="font-medium">{item.count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function fmtPct(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}
