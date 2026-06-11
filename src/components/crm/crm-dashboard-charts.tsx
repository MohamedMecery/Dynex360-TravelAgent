"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/locale-provider";
import type { CrmDashboardCharts } from "@/lib/crm/crm-dashboard-types";

const SOURCE_COLORS = [
  "hsl(173 58% 39%)",
  "hsl(221 83% 53%)",
  "hsl(262 52% 47%)",
  "hsl(24 95% 53%)",
  "hsl(340 75% 55%)",
];

interface CrmDashboardChartsProps {
  charts: CrmDashboardCharts;
  showFinancial: boolean;
}

export function CrmDashboardChartsView({ charts, showFinancial }: CrmDashboardChartsProps) {
  const { t } = useTranslation();

  const sourceLabel = (source: string): string => {
    const key = `leads.source.${source}`;
    const label = t(key);
    return label === key ? source : label;
  };

  const stageLabel = (stage: string): string => {
    const key = `opportunities.stage.${stage}`;
    const label = t(key);
    return label === key ? stage : label;
  };

  const sourcePie = charts.lead_source_analysis.map((row, i) => ({
    name: sourceLabel(row.source),
    value: row.count,
    fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("crmDashboard.charts.leadTrend")}</CardTitle>
        </CardHeader>
        <div className="h-64 px-2 pb-4">
          {charts.lead_trend.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.lead_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(221 83% 53%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("crmDashboard.charts.opportunityFunnel")}</CardTitle>
        </CardHeader>
        <div className="h-64 px-2 pb-4">
          {charts.opportunity_funnel.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.opportunity_funnel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => stageLabel(String(v))}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelFormatter={(v) => stageLabel(String(v))}
                />
                <Bar dataKey="count" fill="hsl(173 58% 39%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {showFinancial && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("crmDashboard.charts.revenueForecast")}</CardTitle>
          </CardHeader>
          <div className="h-64 px-2 pb-4">
            {charts.revenue_forecast.length === 0 ? (
              <p className="px-4 text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.revenue_forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(24 95% 53%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("crmDashboard.charts.leadSources")}</CardTitle>
        </CardHeader>
        <div className="h-64 px-2 pb-4">
          {sourcePie.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">{t("crmDashboard.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourcePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {sourcePie.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
