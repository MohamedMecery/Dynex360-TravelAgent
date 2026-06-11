import type { DuplicateLeadMatch } from "@/lib/crm/duplicate-leads";
import type { LeadHealthResult } from "@/lib/crm/lead-health";
import type { LeadCreateInput, LeadUpdateInput } from "@/lib/validation/lead";
import type { Lead, Opportunity } from "@/types";

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class LeadApiError extends Error {
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
    const code = body.error?.code ?? "ERROR";
    const msg = body.error?.message ?? response.statusText;
    throw new LeadApiError(msg, code, body.error?.details);
  }
  return body;
}

export async function apiCreateLead(
  input: LeadCreateInput,
  options?: { allow_duplicates?: boolean }
): Promise<{
  data: Lead;
  exact_duplicates?: DuplicateLeadMatch[];
  possible_duplicates?: DuplicateLeadMatch[];
}> {
  const qs = options?.allow_duplicates ? "?allow_duplicates=true" : "";
  const response = await fetch(`/api/leads${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{
    data: Lead;
    meta?: {
      exact_duplicates?: DuplicateLeadMatch[];
      possible_duplicates?: DuplicateLeadMatch[];
    };
  }>(response);
  return {
    data: body.data,
    exact_duplicates: body.meta?.exact_duplicates,
    possible_duplicates: body.meta?.possible_duplicates,
  };
}

export async function apiUpdateLead(
  id: string,
  input: LeadUpdateInput,
  options?: { allow_duplicates?: boolean }
): Promise<{
  data: Lead;
  exact_duplicates?: DuplicateLeadMatch[];
  possible_duplicates?: DuplicateLeadMatch[];
}> {
  const qs = options?.allow_duplicates ? "?allow_duplicates=true" : "";
  const response = await fetch(`/api/leads/${id}${qs}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await parseJson<{
    data: Lead;
    meta?: {
      exact_duplicates?: DuplicateLeadMatch[];
      possible_duplicates?: DuplicateLeadMatch[];
    };
  }>(response);
  return {
    data: body.data,
    exact_duplicates: body.meta?.exact_duplicates,
    possible_duplicates: body.meta?.possible_duplicates,
  };
}

export async function apiDeleteLead(id: string): Promise<void> {
  await parseJson(await fetch(`/api/leads/${id}`, { method: "DELETE" }));
}

export async function apiCheckDuplicateLeads(params: {
  email?: string;
  mobile?: string;
  whatsapp?: string;
  exclude_id?: string;
}): Promise<{ exact: DuplicateLeadMatch[]; possible: DuplicateLeadMatch[] }> {
  const qs = new URLSearchParams();
  if (params.email) qs.set("email", params.email);
  if (params.mobile) qs.set("mobile", params.mobile);
  if (params.whatsapp) qs.set("whatsapp", params.whatsapp);
  if (params.exclude_id) qs.set("exclude_id", params.exclude_id);
  const body = await parseJson<{
    data: { exact: DuplicateLeadMatch[]; possible: DuplicateLeadMatch[] };
  }>(await fetch(`/api/leads/check-duplicate?${qs.toString()}`));
  return body.data;
}

export async function apiGetLeadHealth(id: string): Promise<LeadHealthResult> {
  const body = await parseJson<{ data: LeadHealthResult }>(
    await fetch(`/api/leads/${id}/health`)
  );
  return body.data;
}

export async function apiAssignLead(id: string, ownerId: string): Promise<Lead> {
  const body = await parseJson<{ data: Lead }>(
    await fetch(`/api/leads/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_id: ownerId }),
    })
  );
  return body.data;
}

export async function apiConvertLeadToOpportunity(id: string): Promise<{
  opportunity_id: string;
  opportunity: Opportunity;
}> {
  const body = await parseJson<{
    data: { opportunity_id: string; opportunity: Opportunity };
  }>(await fetch(`/api/leads/${id}/convert-opportunity`, { method: "POST" }));
  return body.data;
}

export async function apiConvertLeadToCustomer(id: string): Promise<{
  lead: Lead;
  customer_id: string;
}> {
  const body = await parseJson<{ data: { lead: Lead; customer_id: string } }>(
    await fetch(`/api/leads/${id}/convert-customer`, { method: "POST" })
  );
  return body.data;
}

export async function apiLogWhatsAppActivity(
  leadId: string,
  subject?: string
): Promise<void> {
  await parseJson(
    await fetch(`/api/leads/${leadId}/log-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject ?? "WhatsApp follow-up" }),
    })
  );
}

export function whatsAppUrl(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
