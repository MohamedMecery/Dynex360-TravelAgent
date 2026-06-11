"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { OperationsMetrics } from "@/lib/crm/operations-metrics-service";

export function OperationsDashboardView() {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/operations/metrics");
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message ?? t("operations.loadError"));
      }
      setMetrics(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("operations.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("operations.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("operations.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title={t("operations.metrics.pendingJobs")} value={metrics.jobs_pending} />
        <MetricCard title={t("operations.metrics.failedJobs")} value={metrics.jobs_failed} />
        <MetricCard title={t("operations.metrics.deadLetterJobs")} value={metrics.jobs_dead_letter} />
        <MetricCard title={t("operations.metrics.completedJobs24h")} value={metrics.jobs_completed_24h} />
        <MetricCard title={t("operations.metrics.emailsSent24h")} value={metrics.emails_sent_24h} />
        <MetricCard title={t("operations.metrics.emailsFailed24h")} value={metrics.emails_failed_24h} />
        <MetricCard
          title={t("operations.metrics.notificationsSent24h")}
          value={metrics.notifications_in_app_sent_24h}
        />
        <MetricCard
          title={t("operations.metrics.notificationsFailed24h")}
          value={metrics.notifications_in_app_failed_24h}
        />
        <MetricCard title={t("operations.metrics.events24h")} value={metrics.domain_events_24h} />
        <MetricCard
          title={t("operations.metrics.throughputPerHour")}
          value={metrics.event_throughput_per_hour}
        />
        <MetricCard
          title={t("operations.metrics.whatsappSent24h")}
          value={metrics.whatsapp_sent_24h}
        />
        <MetricCard
          title={t("operations.metrics.whatsappDelivered24h")}
          value={metrics.whatsapp_delivered_24h}
        />
        <MetricCard
          title={t("operations.metrics.whatsappRead24h")}
          value={metrics.whatsapp_read_24h}
        />
        <MetricCard
          title={t("operations.metrics.whatsappFailed24h")}
          value={metrics.whatsapp_failed_24h}
        />
        <MetricCard
          title={t("operations.metrics.whatsappFailureRate24h")}
          value={metrics.whatsapp_failure_rate_24h}
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{title}</p>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
