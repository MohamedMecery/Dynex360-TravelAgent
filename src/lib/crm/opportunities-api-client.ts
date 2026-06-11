import type { OpportunityForecastResult } from "@/lib/crm/opportunities-service";
import type {
  OpportunityCreateBookingInput,
  OpportunityCreateInput,
  OpportunityUpdateInput,
} from "@/lib/validation/opportunity";
import type { Opportunity, OpportunityStageHistoryEntry } from "@/types";

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class OpportunityApiError extends Error {
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
    throw new OpportunityApiError(
      body.error?.message ?? response.statusText,
      body.error?.code ?? "ERROR",
      body.error?.details
    );
  }
  return body;
}

export async function apiCreateOpportunity(
  input: OpportunityCreateInput
): Promise<Opportunity> {
  const body = await parseJson<{ data: Opportunity }>(
    await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}

export async function apiUpdateOpportunity(
  id: string,
  input: OpportunityUpdateInput
): Promise<Opportunity> {
  const body = await parseJson<{ data: Opportunity }>(
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return body.data;
}

export async function apiGetOpportunityForecast(
  period: "month" | "quarter" = "month"
): Promise<OpportunityForecastResult> {
  const body = await parseJson<{ data: OpportunityForecastResult }>(
    await fetch(`/api/opportunities/forecast?period=${period}`)
  );
  return body.data;
}

export async function apiCreateBookingFromOpportunity(
  opportunityId: string,
  input: OpportunityCreateBookingInput,
  options?: { admin_override?: boolean }
): Promise<{
  booking_id: string;
  reference_number: string;
  mode: "package" | "custom";
  redirect_url: string;
}> {
  const body = await parseJson<{
    data: {
      booking_id: string;
      reference_number: string;
      mode: "package" | "custom";
      redirect_url: string;
    };
  }>(
    await fetch(
      `/api/opportunities/${opportunityId}/create-booking${
        options?.admin_override ? "?admin_override=true" : ""
      }`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    )
  );
  return body.data;
}

export async function apiGetOpportunityStageHistory(
  opportunityId: string
): Promise<OpportunityStageHistoryEntry[]> {
  const body = await parseJson<{ data: OpportunityStageHistoryEntry[] }>(
    await fetch(`/api/opportunities/${opportunityId}/stage-history`)
  );
  return body.data;
}
