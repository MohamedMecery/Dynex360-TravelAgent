import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrmDashboardPayload } from "@/lib/crm/crm-dashboard-types";

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parsePayload(raw: unknown): CrmDashboardPayload {
  const data = raw as Record<string, unknown>;
  const kpisRaw = (data.kpis ?? {}) as Record<string, unknown>;
  const chartsRaw = (data.charts ?? {}) as Record<string, unknown>;
  const listsRaw = (data.lists ?? {}) as Record<string, unknown>;
  const periodRaw = (data.period ?? {}) as Record<string, unknown>;

  const leadsBySource: Record<string, number> = {};
  const sourceObj = kpisRaw.leads_by_source;
  if (sourceObj && typeof sourceObj === "object" && !Array.isArray(sourceObj)) {
    for (const [key, val] of Object.entries(sourceObj)) {
      leadsBySource[key] = asNumber(val);
    }
  }

  return {
    period: {
      from: String(periodRaw.from ?? ""),
      to: String(periodRaw.to ?? ""),
    },
    kpis: {
      leads_this_month: asNumber(kpisRaw.leads_this_month),
      leads_by_source: leadsBySource,
      open_opportunities: asNumber(kpisRaw.open_opportunities),
      forecast_revenue:
        kpisRaw.forecast_revenue === null || kpisRaw.forecast_revenue === undefined
          ? null
          : asNumber(kpisRaw.forecast_revenue),
      closed_revenue:
        kpisRaw.closed_revenue === null || kpisRaw.closed_revenue === undefined
          ? null
          : asNumber(kpisRaw.closed_revenue),
      activities_due_today: asNumber(kpisRaw.activities_due_today),
      activities_overdue: asNumber(kpisRaw.activities_overdue),
      whatsapp_activities_7d: asNumber(kpisRaw.whatsapp_activities_7d),
    },
    charts: {
      lead_trend: Array.isArray(chartsRaw.lead_trend)
        ? chartsRaw.lead_trend.map((row) => {
            const r = row as Record<string, unknown>;
            return { week: String(r.week ?? ""), count: asNumber(r.count) };
          })
        : [],
      opportunity_funnel: Array.isArray(chartsRaw.opportunity_funnel)
        ? chartsRaw.opportunity_funnel.map((row) => {
            const r = row as Record<string, unknown>;
            return { stage: String(r.stage ?? ""), count: asNumber(r.count) };
          })
        : [],
      revenue_forecast: Array.isArray(chartsRaw.revenue_forecast)
        ? chartsRaw.revenue_forecast.map((row) => {
            const r = row as Record<string, unknown>;
            return { month: String(r.month ?? ""), amount: asNumber(r.amount) };
          })
        : [],
      lead_source_analysis: Array.isArray(chartsRaw.lead_source_analysis)
        ? chartsRaw.lead_source_analysis.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              source: String(r.source ?? ""),
              count: asNumber(r.count),
              percent: asNumber(r.percent),
            };
          })
        : [],
    },
    lists: {
      overdue_activities: Array.isArray(listsRaw.overdue_activities)
        ? listsRaw.overdue_activities.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: String(r.id ?? ""),
              subject: String(r.subject ?? ""),
              due_date: String(r.due_date ?? ""),
              activity_type: String(r.activity_type ?? ""),
              assigned_to: String(r.assigned_to ?? ""),
            };
          })
        : [],
      stale_leads: Array.isArray(listsRaw.stale_leads)
        ? listsRaw.stale_leads.map((row) => {
            const r = row as Record<string, unknown>;
            return {
              id: String(r.id ?? ""),
              full_name: String(r.full_name ?? ""),
              lead_number: String(r.lead_number ?? ""),
              days_since_contact: asNumber(r.days_since_contact),
            };
          })
        : [],
    },
  };
}

export async function fetchCrmDashboard(
  supabase: SupabaseClient,
  from: Date,
  to: Date,
  includeFinancial: boolean
): Promise<CrmDashboardPayload> {
  const { data, error } = await supabase.rpc("crm_dashboard_stats", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_include_financial: includeFinancial,
  });

  if (error) {
    if (error.message.includes("dashboard permission") || error.code === "42501") {
      throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
    }
    throw new Error(error.message);
  }

  return parsePayload(data);
}
