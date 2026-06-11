export interface CrmDashboardPeriod {
  from: string;
  to: string;
}

export interface CrmDashboardKpis {
  leads_this_month: number;
  leads_by_source: Record<string, number>;
  open_opportunities: number;
  forecast_revenue: number | null;
  closed_revenue: number | null;
  activities_due_today: number;
  activities_overdue: number;
  whatsapp_activities_7d: number;
}

export interface CrmDashboardLeadTrendPoint {
  week: string;
  count: number;
}

export interface CrmDashboardFunnelPoint {
  stage: string;
  count: number;
}

export interface CrmDashboardRevenueForecastPoint {
  month: string;
  amount: number;
}

export interface CrmDashboardSourcePoint {
  source: string;
  count: number;
  percent: number;
}

export interface CrmDashboardCharts {
  lead_trend: CrmDashboardLeadTrendPoint[];
  opportunity_funnel: CrmDashboardFunnelPoint[];
  revenue_forecast: CrmDashboardRevenueForecastPoint[];
  lead_source_analysis: CrmDashboardSourcePoint[];
}

export interface CrmDashboardOverdueActivity {
  id: string;
  subject: string;
  due_date: string;
  activity_type: string;
  assigned_to: string;
}

export interface CrmDashboardStaleLead {
  id: string;
  full_name: string;
  lead_number: string;
  days_since_contact: number;
}

export interface CrmDashboardLists {
  overdue_activities: CrmDashboardOverdueActivity[];
  stale_leads: CrmDashboardStaleLead[];
}

export interface CrmDashboardPayload {
  period: CrmDashboardPeriod;
  kpis: CrmDashboardKpis;
  charts: CrmDashboardCharts;
  lists: CrmDashboardLists;
}
