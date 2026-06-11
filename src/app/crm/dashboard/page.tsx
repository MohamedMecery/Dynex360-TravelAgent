"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCan, useGetIdentity } from "@refinedev/core";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CrmDashboardChartsView } from "@/components/crm/crm-dashboard-charts";
import { useTranslation } from "@/i18n/locale-provider";
import { useFormat } from "@/i18n/use-format";
import type { CrmDashboardPayload } from "@/lib/crm/crm-dashboard-types";
import type { UserRole } from "@/types";

type PeriodKey = "month" | "quarter";

interface SalesWidgets {
  hot_leads: Array<{ id: string; full_name: string; lead_number: string; priority_score: number }>;
  at_risk_opportunities: Array<{
    id: string;
    opportunity_number: string;
    destination_text: string | null;
    health_score: number;
  }>;
  open_recommendations_count: number;
}

interface OpsWidgets {
  at_risk_bookings: Array<{
    id: string;
    reference_number: string;
    travel_date: string | null;
    health_score: number;
    readiness_score: number;
    operational_status: string;
  }>;
  departures_7d: Array<{
    id: string;
    reference_number: string;
    travel_date: string;
    readiness_score: number | null;
  }>;
  open_recommendations_count: number;
}

export default function CrmDashboardPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormat();
  const { data: identity } = useGetIdentity<{ role?: UserRole }>();
  const role = identity?.role;

  const { data: canViewFinancial } = useCan({
    resource: "crm-dashboard",
    action: "financial",
    params: { role },
  });

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [data, setData] = useState<CrmDashboardPayload | null>(null);
  const [salesWidgets, setSalesWidgets] = useState<SalesWidgets | null>(null);
  const [opsWidgets, setOpsWidgets] = useState<OpsWidgets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: canSalesRead } = useCan({
    resource: "ai-sales",
    action: "read",
    params: { role },
  });

  const { data: canOpsRead } = useCan({
    resource: "ai-operations",
    action: "read",
    params: { role },
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, widgetsRes, opsWidgetsRes] = await Promise.all([
        fetch(`/api/crm/dashboard?period=${period}`),
        canSalesRead?.can ? fetch("/api/crm/sales/widgets") : Promise.resolve(null),
        canOpsRead?.can ? fetch("/api/crm/operations/widgets") : Promise.resolve(null),
      ]);
      const body = (await dashRes.json()) as {
        data?: CrmDashboardPayload;
        error?: { message?: string };
      };
      if (!dashRes.ok) {
        throw new Error(body.error?.message ?? t("crmDashboard.loadError"));
      }
      if (body.data) setData(body.data);
      if (widgetsRes?.ok) {
        const wBody = (await widgetsRes.json()) as { data?: SalesWidgets };
        setSalesWidgets(wBody.data ?? null);
      }
      if (opsWidgetsRes?.ok) {
        const oBody = (await opsWidgetsRes.json()) as { data?: OpsWidgets };
        setOpsWidgets(oBody.data ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("crmDashboard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [period, t, canSalesRead?.can, canOpsRead?.can]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const showFinancial = Boolean(canViewFinancial?.can);
  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("crmDashboard.title")}</h2>
        <div className="flex gap-2">
          {(["month", "quarter"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              onClick={() => setPeriod(key)}
            >
              {t(`crmDashboard.period.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t("crmDashboard.kpis.leadsThisMonth")}
          value={loading ? "—" : String(kpis?.leads_this_month ?? 0)}
        />
        <KpiCard
          title={t("crmDashboard.kpis.openOpportunities")}
          value={loading ? "—" : String(kpis?.open_opportunities ?? 0)}
        />
        <KpiCard
          title={t("crmDashboard.kpis.activitiesDueToday")}
          value={loading ? "—" : String(kpis?.activities_due_today ?? 0)}
        />
        <KpiCard
          title={t("crmDashboard.kpis.activitiesOverdue")}
          value={loading ? "—" : String(kpis?.activities_overdue ?? 0)}
        />
        <KpiCard
          title={t("crmDashboard.kpis.whatsapp7d")}
          value={loading ? "—" : String(kpis?.whatsapp_activities_7d ?? 0)}
        />
        {showFinancial && kpis?.forecast_revenue != null && (
          <KpiCard
            title={t("crmDashboard.kpis.forecastRevenue")}
            value={loading ? "—" : formatCurrency(kpis.forecast_revenue)}
          />
        )}
        {showFinancial && kpis?.closed_revenue != null && (
          <KpiCard
            title={t("crmDashboard.kpis.closedRevenue")}
            value={loading ? "—" : formatCurrency(kpis.closed_revenue)}
          />
        )}
        {canSalesRead?.can && salesWidgets && (
          <KpiCard
            title={t("crmDashboard.salesAi.openRecommendations")}
            value={String(salesWidgets.open_recommendations_count)}
          />
        )}
      </div>

      {data && (
        <CrmDashboardChartsView
          charts={data.charts}
          showFinancial={showFinancial}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("crmDashboard.lists.overdueActivities")}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto px-4 pb-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (data?.lists.overdue_activities.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">{t("fields.subject")}</th>
                    <th className="py-2">{t("dashboard.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.lists.overdue_activities.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2">
                        <Link
                          href={`/crm/activities/show/${row.id}`}
                          className="text-primary hover:underline"
                        >
                          {row.subject}
                        </Link>
                      </td>
                      <td className="py-2">{formatDate(row.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("crmDashboard.lists.staleLeads")}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto px-4 pb-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (data?.lists.stale_leads.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">{t("fields.name")}</th>
                    <th className="py-2">{t("crmDashboard.daysSinceContact")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.lists.stale_leads.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2">
                        <Link
                          href={`/crm/leads/show/${row.id}`}
                          className="text-primary hover:underline"
                        >
                          {row.full_name}
                        </Link>
                      </td>
                      <td className="py-2">
                        {row.days_since_contact} {t("common.days")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {canSalesRead?.can && salesWidgets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("crmDashboard.lists.hotLeads")}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto px-4 pb-4">
              {salesWidgets.hot_leads.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {salesWidgets.hot_leads.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2">
                          <Link
                            href={`/crm/leads/show/${row.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.full_name}
                          </Link>
                        </td>
                        <td className="py-2 text-right">{row.priority_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("crmDashboard.lists.atRiskOpportunities")}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto px-4 pb-4">
              {salesWidgets.at_risk_opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {salesWidgets.at_risk_opportunities.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2">
                          <Link
                            href={`/crm/opportunities/show/${row.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.destination_text ?? row.opportunity_number}
                          </Link>
                        </td>
                        <td className="py-2 text-right">{row.health_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      {canOpsRead?.can && opsWidgets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <KpiCard
            title={t("crmDashboard.opsAi.openRecommendations")}
            value={String(opsWidgets.open_recommendations_count)}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t("crmDashboard.opsAi.atRiskBookings")}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto px-4 pb-4">
              {opsWidgets.at_risk_bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {opsWidgets.at_risk_bookings.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2">
                          <Link
                            href={`/bookings/show/${row.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.reference_number}
                          </Link>
                        </td>
                        <td className="py-2 text-right">{row.health_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("crmDashboard.opsAi.departures7d")}</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto px-4 pb-4">
              {opsWidgets.departures_7d.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {opsWidgets.departures_7d.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2">
                          <Link
                            href={`/bookings/show/${row.id}`}
                            className="text-primary hover:underline"
                          >
                            {row.reference_number}
                          </Link>
                        </td>
                        <td className="py-2 text-right">
                          {row.readiness_score != null ? `${row.readiness_score}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardHeader>
    </Card>
  );
}
