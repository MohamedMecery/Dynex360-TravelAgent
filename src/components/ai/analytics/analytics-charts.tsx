"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import type { AgentUsageRow, AnalyticsUsageTrends } from "@/lib/ai/analytics/types";
import type { AiAgentKey } from "@/types";

const AGENT_COLORS: Record<AiAgentKey, string> = {
  knowledge: "hsl(173 58% 39%)",
  booking: "hsl(221 83% 53%)",
  support: "hsl(262 52% 47%)",
  sales: "hsl(142 71% 35%)",
  operations: "hsl(24 95% 45%)",
};

interface AnalyticsChartsProps {
  agentUsage: AgentUsageRow[];
  usageTrends: AnalyticsUsageTrends;
}

export function AnalyticsCharts({ agentUsage, usageTrends }: AnalyticsChartsProps) {
  const { t } = useTranslation();

  const pieData = agentUsage.map((row) => ({
    name: t(`aiHistory.agents.${row.agent_key}`),
    key: row.agent_key,
    value: row.count,
  }));

  const volumeData = usageTrends.conversation_volume.map((row) => ({
    day: row.day,
    count: row.conversation_count,
  }));

  const dauData = usageTrends.daily_active_users.map((row) => ({
    day: row.day,
    users: row.active_users,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("aiAnalytics.charts.agentDistribution")}</CardTitle>
        </CardHeader>
        <div className="h-64 px-2 pb-4">
          {pieData.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">{t("aiAnalytics.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={AGENT_COLORS[entry.key as AiAgentKey]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("aiAnalytics.charts.conversationVolume")}</CardTitle>
        </CardHeader>
        <div className="h-64 px-2 pb-4">
          {volumeData.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">{t("aiAnalytics.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name={t("aiAnalytics.charts.conversations")}
                  stroke="hsl(221 83% 53%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("aiAnalytics.charts.dailyActiveUsers")}</CardTitle>
        </CardHeader>
        <div className="h-64 px-2 pb-4">
          {dauData.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">{t("aiAnalytics.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dauData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="users"
                  name={t("aiAnalytics.charts.activeUsers")}
                  fill="hsl(173 58% 39%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
