import { apiFetch } from "@/lib/api-client";
import type {
  ActivityCreateInput,
  ActivityListView,
  ActivityUpdateInput,
  Assignee,
  CrmActivity,
  CrmDashboardPayload,
  Lead,
  LeadCreateInput,
  LeadUpdateInput,
  Opportunity,
  OpportunityCreateInput,
  OpportunityUpdateInput,
  PaginatedMeta,
} from "@/types/crm";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function fetchDashboard(
  period: "month" | "quarter" = "month"
): Promise<CrmDashboardPayload> {
  const body = await apiFetch<{ data: CrmDashboardPayload }>(
    `/api/crm/dashboard?period=${period}`
  );
  return body.data;
}

export async function fetchLeads(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
}): Promise<{ data: Lead[]; meta: PaginatedMeta }> {
  return apiFetch(`/api/leads${buildQuery(params)}`);
}

export async function fetchLead(id: string): Promise<Lead> {
  const body = await apiFetch<{ data: Lead }>(`/api/leads/${id}`);
  return body.data;
}

export async function createLead(
  input: LeadCreateInput
): Promise<Lead> {
  const body = await apiFetch<{ data: Lead }>("/api/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function updateLead(
  id: string,
  input: LeadUpdateInput
): Promise<Lead> {
  const body = await apiFetch<{ data: Lead }>(`/api/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function assignLead(id: string, ownerId: string): Promise<Lead> {
  const body = await apiFetch<{ data: Lead }>(`/api/leads/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ owner_id: ownerId }),
  });
  return body.data;
}

export async function convertLeadToOpportunity(id: string): Promise<{
  opportunity_id: string;
  opportunity: Opportunity;
}> {
  const body = await apiFetch<{
    data: { opportunity_id: string; opportunity: Opportunity };
  }>(`/api/leads/${id}/convert-opportunity`, { method: "POST" });
  return body.data;
}

export async function fetchOpportunities(params: {
  page?: number;
  limit?: number;
  search?: string;
  stage?: string;
}): Promise<{ data: Opportunity[]; meta: PaginatedMeta }> {
  return apiFetch(`/api/opportunities${buildQuery(params)}`);
}

export async function fetchOpportunity(id: string): Promise<Opportunity> {
  const body = await apiFetch<{ data: Opportunity }>(`/api/opportunities/${id}`);
  return body.data;
}

export async function createOpportunity(
  input: OpportunityCreateInput
): Promise<Opportunity> {
  const body = await apiFetch<{ data: Opportunity }>("/api/opportunities", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function updateOpportunity(
  id: string,
  input: OpportunityUpdateInput
): Promise<Opportunity> {
  const body = await apiFetch<{ data: Opportunity }>(`/api/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function createBookingFromOpportunity(
  opportunityId: string,
  input: {
    package_id?: string;
    notes?: string;
    line_items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
    }>;
  }
): Promise<{
  booking_id: string;
  reference_number: string;
}> {
  const body = await apiFetch<{
    data: { booking_id: string; reference_number: string };
  }>(`/api/opportunities/${opportunityId}/create-booking`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function fetchActivities(params: {
  view?: ActivityListView;
  page?: number;
  limit?: number;
  lead_id?: string;
  opportunity_id?: string;
}): Promise<{ data: CrmActivity[]; meta: PaginatedMeta }> {
  return apiFetch(`/api/activities${buildQuery(params)}`);
}

export async function fetchActivity(id: string): Promise<CrmActivity> {
  const body = await apiFetch<{ data: CrmActivity }>(`/api/activities/${id}`);
  return body.data;
}

export async function createActivity(
  input: ActivityCreateInput
): Promise<CrmActivity> {
  const body = await apiFetch<{ data: CrmActivity }>("/api/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function updateActivity(
  id: string,
  input: ActivityUpdateInput
): Promise<CrmActivity> {
  const body = await apiFetch<{ data: CrmActivity }>(`/api/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function fetchAssignees(
  search?: string
): Promise<Assignee[]> {
  const body = await apiFetch<{ data: Assignee[] }>(
    `/api/users/assignees${buildQuery({ search })}`
  );
  return body.data;
}

export interface SalesSnapshotBadge {
  entity_id: string;
  entity_type: string;
  health_score: number | null;
  priority_score: number | null;
  priority_tier: string | null;
}

export async function fetchSalesSnapshots(
  entityType: "lead" | "opportunity",
  entityIds: string[]
): Promise<SalesSnapshotBadge[]> {
  if (entityIds.length === 0) return [];
  const body = await apiFetch<{ data: SalesSnapshotBadge[] }>(
    `/api/crm/sales/snapshots?entity_type=${entityType}&entity_ids=${entityIds.join(",")}`
  );
  return body.data ?? [];
}

export async function fetchSalesWidgets(): Promise<{ open_recommendations_count: number }> {
  const body = await apiFetch<{
    data: { open_recommendations_count: number };
  }>("/api/crm/sales/widgets");
  return body.data;
}

export interface OpsSnapshotBadge {
  entity_id: string;
  entity_type: string;
  health_score: number | null;
  readiness_score: number | null;
  operational_status: string | null;
}

export async function fetchOpsSnapshots(entityIds: string[]): Promise<OpsSnapshotBadge[]> {
  if (entityIds.length === 0) return [];
  const body = await apiFetch<{ data: OpsSnapshotBadge[] }>(
    `/api/crm/operations/snapshots?entity_type=booking&entity_ids=${entityIds.join(",")}`
  );
  return body.data ?? [];
}

export async function fetchOpsWidgets(): Promise<{
  open_recommendations_count: number;
  at_risk_bookings: unknown[];
}> {
  const body = await apiFetch<{
    data: { open_recommendations_count: number; at_risk_bookings: unknown[] };
  }>("/api/crm/operations/widgets");
  return body.data;
}
