import type { TimelineEvent } from "@/lib/crm/timeline-events";
import type { ActivityListView } from "@/lib/validation/activity";
import type {
  ActivityCreateInput,
  ActivityUpdateInput,
} from "@/lib/validation/activity";
import type { CrmActivity } from "@/types";

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class ActivityApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & ApiErrorBody;
  if (!response.ok) {
    throw new ActivityApiError(
      body.error?.message ?? response.statusText,
      body.error?.code ?? "ERROR",
      body.error?.details
    );
  }
  return body;
}

export interface ListActivitiesQuery {
  view?: ActivityListView;
  lead_id?: string;
  opportunity_id?: string;
  customer_id?: string;
  assigned_to?: string;
  page?: number;
  limit?: number;
}

function buildActivityQueryString(query: ListActivitiesQuery): string {
  const params = new URLSearchParams();
  if (query.view) params.set("view", query.view);
  if (query.lead_id) params.set("lead_id", query.lead_id);
  if (query.opportunity_id) params.set("opportunity_id", query.opportunity_id);
  if (query.customer_id) params.set("customer_id", query.customer_id);
  if (query.assigned_to) params.set("assigned_to", query.assigned_to);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  return params.toString();
}

export async function apiListActivities(
  query: ListActivitiesQuery = {}
): Promise<{ data: CrmActivity[]; meta: { total: number; page: number; limit: number } }> {
  const view = query.view ?? "upcoming";
  const qs = buildActivityQueryString({ ...query, view });
  const body = await parseJson<{
    data: CrmActivity[];
    meta: { total: number; page: number; limit: number };
  }>(await fetch(`/api/activities${qs ? `?${qs}` : ""}`));
  return { data: body.data, meta: body.meta };
}

export async function apiListActivityTimelineEvents(
  query: Omit<ListActivitiesQuery, "view"> = {}
): Promise<{ data: TimelineEvent[]; meta: { total: number; page: number; limit: number } }> {
  const qs = buildActivityQueryString({ ...query, view: "timeline" });
  const body = await parseJson<{
    data: TimelineEvent[];
    meta: { total: number; page: number; limit: number };
  }>(await fetch(`/api/activities?${qs}`));
  return { data: body.data, meta: body.meta };
}

export async function apiCreateActivity(
  input: ActivityCreateInput
): Promise<CrmActivity> {
  const body = await parseJson<{ data: CrmActivity }>(
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}

export async function apiUpdateActivity(
  id: string,
  input: ActivityUpdateInput
): Promise<CrmActivity> {
  const body = await parseJson<{ data: CrmActivity }>(
    await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}

export async function apiDeleteActivity(id: string): Promise<void> {
  await parseJson<{ data: { id: string } }>(
    await fetch(`/api/activities/${id}`, { method: "DELETE" })
  );
}
