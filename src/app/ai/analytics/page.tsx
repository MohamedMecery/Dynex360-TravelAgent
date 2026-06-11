"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCan } from "@refinedev/core";
import { Download } from "lucide-react";
import { AnalyticsCharts } from "@/components/ai/analytics/analytics-charts";
import { AnalyticsDateRange } from "@/components/ai/analytics/analytics-date-range";
import { AnalyticsKpiCard } from "@/components/ai/analytics/analytics-kpi-card";
import { AnalyticsRankingTable } from "@/components/ai/analytics/analytics-ranking-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { AiAnalyticsData, AnalyticsPreset } from "@/lib/ai/analytics/types";
import type { UserRole } from "@/types";

function buildAnalyticsQuery(
  preset: AnalyticsPreset,
  customFrom: string,
  customTo: string
): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom" && customFrom && customTo) {
    params.set("from", new Date(`${customFrom}T00:00:00.000Z`).toISOString());
    params.set("to", new Date(`${customTo}T00:00:00.000Z`).toISOString());
  }
  return params.toString();
}

function defaultCustomRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function AiAnalyticsPage() {
  const { t, locale } = useTranslation();
  const { formatDate } = useFormat();
  const { data: canAccess } = useCan({ resource: "ai-analytics", action: "list" });

  const [preset, setPreset] = useState<AnalyticsPreset>("30d");
  const [customRange, setCustomRange] = useState(defaultCustomRange);
  const [data, setData] = useState<AiAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(
    () => buildAnalyticsQuery(preset, customRange.from, customRange.to),
    [preset, customRange.from, customRange.to]
  );

  const loadAnalytics = useCallback(async () => {
    if (canAccess?.can === false) return;
    if (preset === "custom" && (!customRange.from || !customRange.to)) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/analytics?${queryString}`, {
        headers: { "Accept-Language": locale },
      });
      const body = (await response.json()) as {
        data?: AiAnalyticsData;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(body.error?.message ?? t("aiAnalytics.loadError"));
      }

      if (body.data) {
        setData(body.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiAnalytics.loadError"));
    } finally {
      setLoading(false);
    }
  }, [canAccess?.can, queryString, preset, customRange.from, customRange.to, t, locale]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const periodLabel = useMemo(() => {
    if (!data?.period) return "";
    const from = formatDate(data.period.from);
    const to = formatDate(data.period.to);
    return `${from} – ${to}`;
  }, [data?.period, formatDate]);

  const exportHref = (type: "feedback" | "usage" | "support") =>
    `/api/ai/analytics/export?${queryString}&type=${type}`;

  if (canAccess?.can === false) {
    return (
      <div>
        <h2 className="text-2xl font-bold">{t("aiAnalytics.title")}</h2>
        <p className="mt-4 text-sm text-muted-foreground">{t("aiAnalytics.forbidden")}</p>
      </div>
    );
  }

  const feedbackDisplay =
    data?.executive.feedback_rate != null
      ? `${data.executive.feedback_rate}%`
      : t("aiAnalytics.noFeedback");

  return (
    <div data-testid="ai-analytics-page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("aiAnalytics.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("aiAnalytics.subtitle")}</p>
          {periodLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref("feedback")}
            className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Download className="me-1 h-3.5 w-3.5" />
            {t("aiAnalytics.export.feedback")}
          </a>
          <a
            href={exportHref("usage")}
            className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Download className="me-1 h-3.5 w-3.5" />
            {t("aiAnalytics.export.usage")}
          </a>
          <a
            href={exportHref("support")}
            className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Download className="me-1 h-3.5 w-3.5" />
            {t("aiAnalytics.export.support")}
          </a>
        </div>
      </div>

      <AnalyticsDateRange
        className="mb-6"
        preset={preset}
        customFrom={customRange.from}
        customTo={customRange.to}
        onPresetChange={setPreset}
        onCustomFromChange={(from) => setCustomRange((prev) => ({ ...prev, from }))}
        onCustomToChange={(to) => setCustomRange((prev) => ({ ...prev, to }))}
      />

      {error ? (
        <div
          className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AnalyticsKpiCard
          label={t("aiAnalytics.kpis.totalConversations")}
          value={loading ? "—" : String(data?.executive.total_conversations ?? 0)}
        />
        <AnalyticsKpiCard
          label={t("aiAnalytics.kpis.activeUsers")}
          value={loading ? "—" : String(data?.executive.active_users ?? 0)}
        />
        <AnalyticsKpiCard
          label={t("aiAnalytics.kpis.feedbackRate")}
          value={loading ? "—" : feedbackDisplay}
        />
        <AnalyticsKpiCard
          label={t("aiAnalytics.kpis.ticketsCreated")}
          value={loading ? "—" : String(data?.support.tickets_created ?? 0)}
        />
        <AnalyticsKpiCard
          label={t("aiAnalytics.kpis.ticketsResolved")}
          value={loading ? "—" : String(data?.support.tickets_resolved ?? 0)}
        />
      </div>

      {!loading && data ? <AnalyticsCharts agentUsage={data.agent_usage} usageTrends={data.usage_trends} /> : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AnalyticsRankingTable
          title={t("aiAnalytics.rankings.documents")}
          emptyLabel={t("aiAnalytics.noData")}
          columns={[
            { key: "title", label: t("aiAnalytics.rankings.document") },
            { key: "count", label: t("aiAnalytics.rankings.references") },
          ]}
          rows={(data?.top_documents ?? []).map((row) => ({
            title: row.document_title,
            count: row.reference_count,
          }))}
        />
        <AnalyticsRankingTable
          title={t("aiAnalytics.rankings.packages")}
          emptyLabel={t("aiAnalytics.noData")}
          columns={[
            { key: "title", label: t("aiAnalytics.rankings.package") },
            { key: "count", label: t("aiAnalytics.rankings.bookings") },
          ]}
          rows={(data?.top_packages ?? []).map((row) => ({
            title: row.package_title,
            count: row.booking_count,
          }))}
        />
        <AnalyticsRankingTable
          title={t("aiAnalytics.rankings.destinations")}
          emptyLabel={t("aiAnalytics.noData")}
          columns={[
            { key: "title", label: t("aiAnalytics.rankings.destination") },
            { key: "count", label: t("aiAnalytics.rankings.bookings") },
          ]}
          rows={(data?.top_destinations ?? []).map((row) => ({
            title: row.destination_name,
            count: row.booking_count,
          }))}
        />
      </div>

      {data?.insights && data.insights.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">{t("aiAnalytics.insightsTitle")}</CardTitle>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {data.insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("aiAnalytics.phase2Note")}</p>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}
