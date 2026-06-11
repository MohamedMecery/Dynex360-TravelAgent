import type { SupabaseClient } from "@supabase/supabase-js";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import {
  classifyLeadDuplicates,
  type DuplicateLeadMatch,
  type LeadDuplicateCheckResult,
} from "@/lib/crm/duplicate-leads";
import type { LeadCreateInput, LeadUpdateInput } from "@/lib/validation/lead";
import type { Lead, Opportunity, UserRole } from "@/types";

export interface ListLeadsParams {
  search?: string;
  status?: string;
  source?: string;
  owner_id?: string;
  page?: number;
  limit?: number;
}

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first_name: "Lead", last_name: "-" };
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" ") || "-",
  };
}

export async function listLeads(
  supabase: SupabaseClient,
  tenantId: string,
  params: ListLeadsParams
): Promise<{ data: Lead[]; total: number }> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.source) {
    query = query.eq("source", params.source);
  }
  if (params.owner_id) {
    query = query.eq("owner_id", params.owner_id);
  }
  if (params.search?.trim()) {
    const q = params.search.trim().replace(/,/g, " ");
    const term = `%${q}%`;
    query = query.or(
      [
        `full_name.ilike.${term}`,
        `email.ilike.${term}`,
        `mobile.ilike.${term}`,
        `whatsapp.ilike.${term}`,
        `lead_number.ilike.${term}`,
      ].join(",")
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return { data: (data ?? []) as Lead[], total: count ?? 0 };
}

export async function getLeadById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Lead not found");
  }
  return data as Lead;
}

export async function checkLeadDuplicates(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    email?: string | null;
    mobile?: string | null;
    whatsapp?: string | null;
    exclude_id?: string;
  }
): Promise<LeadDuplicateCheckResult> {
  return classifyLeadDuplicates(supabase, tenantId, input);
}

export async function createLead(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  input: LeadCreateInput,
  options?: { allow_duplicates?: boolean }
): Promise<{
  lead: Lead;
  exact_duplicates: DuplicateLeadMatch[];
  possible_duplicates: DuplicateLeadMatch[];
}> {
  const { exact, possible } = await classifyLeadDuplicates(supabase, tenantId, {
    email: input.email,
    mobile: input.mobile,
    whatsapp: input.whatsapp,
  });

  if (exact.length > 0 && !options?.allow_duplicates) {
    const err = new Error("Exact duplicate lead detected");
    (err as Error & { code: string; duplicates: DuplicateLeadMatch[] }).code =
      "EXACT_DUPLICATE_LEAD";
    (err as Error & { duplicates: DuplicateLeadMatch[] }).duplicates = exact;
    throw err;
  }

  const payload = {
    tenant_id: tenantId,
    full_name: input.full_name,
    mobile: input.mobile ?? null,
    whatsapp: input.whatsapp ?? input.mobile ?? null,
    email: input.email || null,
    preferred_contact_channel: input.preferred_contact_channel ?? "whatsapp",
    source: input.source,
    destination_id: input.destination_id ?? null,
    destination_text: input.destination_text ?? null,
    expected_budget: input.expected_budget ?? null,
    currency: input.currency ?? "USD",
    travel_date: input.travel_date ?? null,
    pax_count: input.pax_count ?? 1,
    notes: input.notes ?? null,
    owner_id: input.owner_id ?? userId,
    status: input.status ?? "new",
    lead_number: "",
  };

  const { data, error } = await supabase.from("leads").insert(payload).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return { lead: data as Lead, exact_duplicates: exact, possible_duplicates: possible };
}

export async function updateLead(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  input: LeadUpdateInput,
  options?: { allow_duplicates?: boolean }
): Promise<{
  lead: Lead;
  exact_duplicates: DuplicateLeadMatch[];
  possible_duplicates: DuplicateLeadMatch[];
}> {
  const { exact, possible } = await classifyLeadDuplicates(supabase, tenantId, {
    email: input.email,
    mobile: input.mobile,
    whatsapp: input.whatsapp,
    exclude_id: id,
  });

  if (exact.length > 0 && !options?.allow_duplicates) {
    const err = new Error("Exact duplicate lead detected");
    (err as Error & { code: string }).code = "EXACT_DUPLICATE_LEAD";
    (err as Error & { duplicates: DuplicateLeadMatch[] }).duplicates = exact;
    throw err;
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      ...input,
      email: input.email === "" ? null : input.email,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return { lead: data as Lead, exact_duplicates: exact, possible_duplicates: possible };
}

export async function softDeleteLead(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function assignLead(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  ownerId: string
): Promise<Lead> {
  const { lead } = await updateLead(supabase, tenantId, id, { owner_id: ownerId });
  return lead;
}

export async function convertLeadToOpportunity(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  leadId: string
): Promise<Opportunity> {
  const lead = await getLeadById(supabase, tenantId, leadId);

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      tenant_id: tenantId,
      lead_id: lead.id,
      customer_id: lead.customer_id,
      destination_id: lead.destination_id,
      destination_text: lead.destination_text,
      expected_budget: lead.expected_budget,
      estimated_revenue: lead.expected_budget,
      currency: lead.currency,
      expected_travel_date: lead.travel_date,
      pax_count: lead.pax_count,
      probability: 25,
      owner_id: lead.owner_id ?? userId,
      notes: lead.notes,
      opportunity_number: "",
      stage: "discovery",
      lead_source: lead.source,
      preferred_contact_channel: lead.preferred_contact_channel,
      whatsapp: lead.whatsapp ?? lead.mobile ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (lead.status === "new" || lead.status === "contacted") {
    await updateLead(supabase, tenantId, leadId, { status: "qualified" }, {
      allow_duplicates: true,
    });
  }

  return data as Opportunity;
}

export async function convertLeadToCustomer(
  supabase: SupabaseClient,
  tenantId: string,
  leadId: string,
  linkExistingCustomerId?: string
): Promise<{ lead: Lead; customer_id: string }> {
  const lead = await getLeadById(supabase, tenantId, leadId);

  let customerId = linkExistingCustomerId ?? lead.customer_id ?? null;

  if (!customerId) {
    const { first_name, last_name } = splitFullName(lead.full_name);
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        tenant_id: tenantId,
        type: "individual",
        first_name,
        last_name,
        email: lead.email,
        phone: lead.mobile ?? lead.whatsapp,
        notes: lead.notes,
      })
      .select("id")
      .single();

    if (custErr) {
      throw new Error(custErr.message);
    }
    customerId = customer.id;
  }

  const { lead: updated } = await updateLead(
    supabase,
    tenantId,
    leadId,
    {
      customer_id: customerId,
      status: "won",
    },
    { allow_duplicates: true }
  );

  return { lead: updated, customer_id: customerId as string };
}

export function assertLeadWriteAccess(role: UserRole, lead: Lead, userId: string): void {
  if (hasCrmPermission(role, "crm.leads.write_all")) {
    return;
  }
  if (hasCrmPermission(role, "crm.leads.write") && lead.owner_id === userId) {
    return;
  }
  throw new Error("Forbidden: cannot modify this lead");
}
