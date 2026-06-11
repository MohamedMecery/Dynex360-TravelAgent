export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource =
  | "whatsapp"
  | "website"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "referral"
  | "walk_in"
  | "phone_call"
  | "other";

export type OpportunityStage =
  | "discovery"
  | "proposal"
  | "negotiation"
  | "verbal_approval"
  | "closed_won"
  | "closed_lost";

export type ActivityType = "call" | "whatsapp" | "email" | "meeting" | "task";
export type ActivityStatus = "open" | "in_progress" | "completed" | "cancelled";
export type ActivityDirection = "incoming" | "outgoing";
export type ActivityListView = "timeline" | "upcoming" | "overdue" | "my";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Lead {
  id: string;
  tenant_id: string;
  lead_number: string;
  full_name: string;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  preferred_contact_channel: string;
  source: LeadSource;
  destination_text?: string | null;
  expected_budget?: number | null;
  currency: string;
  travel_date?: string | null;
  pax_count: number;
  notes?: string | null;
  owner_id: string;
  status: LeadStatus;
  customer_id?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  tenant_id: string;
  opportunity_number: string;
  lead_id?: string | null;
  customer_id?: string | null;
  destination_text?: string | null;
  expected_budget?: number | null;
  estimated_revenue?: number | null;
  currency: string;
  expected_travel_date?: string | null;
  pax_count: number;
  probability?: number | null;
  expected_close_date?: string | null;
  stage: OpportunityStage;
  owner_id: string;
  notes?: string | null;
  whatsapp?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  tenant_id: string;
  activity_type: ActivityType;
  direction?: ActivityDirection | null;
  subject: string;
  description?: string | null;
  due_date?: string | null;
  assigned_to: string;
  related_lead_id?: string | null;
  related_opportunity_id?: string | null;
  related_customer_id?: string | null;
  status: ActivityStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignee {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
}

export interface CrmDashboardPayload {
  period: { from: string; to: string };
  kpis: {
    leads_this_month: number;
    open_opportunities: number;
    forecast_revenue: number | null;
    closed_revenue: number | null;
    activities_due_today: number;
    activities_overdue: number;
    whatsapp_activities_7d: number;
  };
  lists: {
    overdue_activities: Array<{
      id: string;
      subject: string;
      due_date: string;
      activity_type: string;
    }>;
    stale_leads: Array<{
      id: string;
      full_name: string;
      lead_number: string;
      days_since_contact: number;
    }>;
  };
}

export interface LeadCreateInput {
  full_name: string;
  source: LeadSource;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
  status?: LeadStatus;
  owner_id?: string;
}

export type LeadUpdateInput = Partial<LeadCreateInput> & {
  customer_id?: string | null;
  lost_reason?: string | null;
};

export interface OpportunityCreateInput {
  lead_id?: string | null;
  customer_id?: string | null;
  destination_text?: string | null;
  estimated_revenue?: number | null;
  currency?: string;
  stage?: OpportunityStage;
  probability?: number | null;
  notes?: string | null;
  owner_id?: string;
}

export type OpportunityUpdateInput = Partial<OpportunityCreateInput>;

export interface ActivityCreateInput {
  activity_type: ActivityType;
  subject: string;
  description?: string | null;
  due_date?: string | null;
  direction?: ActivityDirection | null;
  related_lead_id?: string | null;
  related_opportunity_id?: string | null;
  related_customer_id?: string | null;
  status?: ActivityStatus;
  assigned_to?: string;
}

export type ActivityUpdateInput = Partial<ActivityCreateInput>;
