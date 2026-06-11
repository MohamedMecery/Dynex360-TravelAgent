import type { SupabaseClient } from "@supabase/supabase-js";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import { buildDraftPreview, executeCreateDraft } from "@/lib/ai/booking-tools";
import type { TravelerInput } from "@/lib/validation/booking-agent";
import type {
  OpportunityCreateBookingInput,
  OpportunityCreateInput,
  OpportunityUpdateInput,
} from "@/lib/validation/opportunity";
import type {
  Opportunity,
  OpportunityStage,
  OpportunityStageHistoryEntry,
  UserRole,
} from "@/types";

const BOOKING_ALLOWED_STAGES: OpportunityStage[] = [
  "verbal_approval",
  "closed_won",
];

export class OpportunityBookingStageError extends Error {
  code = "BOOKING_STAGE_NOT_ALLOWED";

  constructor(stage: OpportunityStage) {
    super(
      `Create booking requires stage Verbal Approval or Closed Won (current: ${stage}).`
    );
  }
}

export function assertOpportunityBookingStage(
  opportunity: Opportunity,
  role: UserRole,
  adminOverride?: boolean
): void {
  if (BOOKING_ALLOWED_STAGES.includes(opportunity.stage)) {
    return;
  }
  if (role === "tenant_admin" && adminOverride) {
    return;
  }
  if (role === "super_admin") {
    return;
  }
  throw new OpportunityBookingStageError(opportunity.stage);
}

export async function listOpportunityStageHistory(
  supabase: SupabaseClient,
  tenantId: string,
  opportunityId: string
): Promise<OpportunityStageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("opportunity_stage_history")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("opportunity_id", opportunityId)
    .order("changed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as OpportunityStageHistoryEntry[];
}

export interface ListOpportunitiesParams {
  search?: string;
  stage?: string;
  owner_id?: string;
  lead_id?: string;
  page?: number;
  limit?: number;
}

const OPEN_STAGES: OpportunityStage[] = [
  "discovery",
  "proposal",
  "negotiation",
  "verbal_approval",
];

export interface OpportunityForecastResult {
  period: "month" | "quarter";
  total_weighted: number;
  currency: string;
  series: { period: string; weighted_amount: number; count: number }[];
}

export async function listOpportunities(
  supabase: SupabaseClient,
  tenantId: string,
  params: ListOpportunitiesParams
): Promise<{ data: Opportunity[]; total: number }> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("opportunities")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.stage) query = query.eq("stage", params.stage);
  if (params.owner_id) query = query.eq("owner_id", params.owner_id);
  if (params.lead_id) query = query.eq("lead_id", params.lead_id);
  if (params.search?.trim()) {
    const term = `%${params.search.trim().replace(/,/g, " ")}%`;
    query = query.or(
      [
        `destination_text.ilike.${term}`,
        `opportunity_number.ilike.${term}`,
        `notes.ilike.${term}`,
      ].join(",")
    );
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as Opportunity[], total: count ?? 0 };
}

export async function getOpportunityById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Opportunity not found");
  return data as Opportunity;
}

export async function createOpportunity(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  input: OpportunityCreateInput
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      tenant_id: tenantId,
      lead_id: input.lead_id ?? null,
      customer_id: input.customer_id ?? null,
      destination_id: input.destination_id ?? null,
      destination_text: input.destination_text ?? null,
      expected_budget: input.expected_budget ?? null,
      estimated_revenue: input.estimated_revenue ?? input.expected_budget ?? null,
      currency: input.currency ?? "USD",
      expected_travel_date: input.expected_travel_date ?? null,
      pax_count: input.pax_count ?? 1,
      probability: input.probability ?? 25,
      expected_close_date: input.expected_close_date ?? null,
      stage: input.stage ?? "discovery",
      owner_id: input.owner_id ?? userId,
      notes: input.notes ?? null,
      lead_source: input.lead_source ?? null,
      preferred_contact_channel: input.preferred_contact_channel ?? null,
      whatsapp: input.whatsapp ?? null,
      opportunity_number: "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Opportunity;
}

export async function updateOpportunity(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  input: OpportunityUpdateInput
): Promise<Opportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Opportunity;
}

export async function softDeleteOpportunity(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("opportunities")
    .update({ deleted_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function assertOpportunityWriteAccess(
  role: UserRole,
  opportunity: Opportunity,
  userId: string
): void {
  if (hasCrmPermission(role, "crm.opportunities.write_all")) return;
  if (hasCrmPermission(role, "crm.opportunities.write") && opportunity.owner_id === userId) {
    return;
  }
  throw new Error("Forbidden: cannot modify this opportunity");
}

export async function getOpportunityForecast(
  supabase: SupabaseClient,
  tenantId: string,
  period: "month" | "quarter"
): Promise<OpportunityForecastResult> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("estimated_revenue, probability, currency, expected_close_date, stage")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .in("stage", OPEN_STAGES);

  if (error) throw new Error(error.message);

  const bucket = new Map<string, { weighted_amount: number; count: number }>();
  let totalWeighted = 0;
  let currency = "USD";

  for (const row of data ?? []) {
    const revenue = Number(row.estimated_revenue ?? 0);
    const prob = Number(row.probability ?? 0) / 100;
    const weighted = revenue * prob;
    totalWeighted += weighted;
    if (row.currency) currency = row.currency;

    const closeDate = row.expected_close_date as string | null;
    const key = closeDate
      ? period === "quarter"
        ? `${closeDate.slice(0, 4)}-Q${Math.ceil(Number(closeDate.slice(5, 7)) / 3)}`
        : closeDate.slice(0, 7)
      : "unscheduled";

    const prev = bucket.get(key) ?? { weighted_amount: 0, count: 0 };
    bucket.set(key, {
      weighted_amount: prev.weighted_amount + weighted,
      count: prev.count + 1,
    });
  }

  const series = Array.from(bucket.entries())
    .map(([p, v]) => ({ period: p, weighted_amount: v.weighted_amount, count: v.count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return { period, total_weighted: totalWeighted, currency, series };
}

async function ensureBookingTraveler(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  customerId: string,
  traveler: TravelerInput
): Promise<string> {
  if (traveler.traveler_id) return traveler.traveler_id;
  const { data, error } = await supabase
    .from("travelers")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      first_name: traveler.first_name,
      last_name: traveler.last_name,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create traveler");
  return data.id;
}

function defaultTravelers(
  firstName: string,
  lastName: string,
  paxCount: number
): TravelerInput[] {
  const rows: TravelerInput[] = [
    { first_name: firstName, last_name: lastName, tier: "adult" },
  ];
  for (let i = 1; i < paxCount; i++) {
    rows.push({
      first_name: firstName,
      last_name: `${lastName} (${i + 1})`,
      tier: "adult",
    });
  }
  return rows;
}

export async function createBookingFromOpportunity(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  opportunityId: string,
  input: OpportunityCreateBookingInput,
  options?: { role: UserRole; admin_override?: boolean }
): Promise<{ booking_id: string; reference_number: string; mode: "package" | "custom" }> {
  const opportunity = await getOpportunityById(supabase, tenantId, opportunityId);

  if (options?.role) {
    assertOpportunityBookingStage(
      opportunity,
      options.role,
      options.admin_override
    );
  }

  if (!opportunity.customer_id) {
    throw new Error(
      "Opportunity has no customer. Convert the lead to a customer or link a customer first."
    );
  }

  const travelDate =
    input.travel_date ??
    opportunity.expected_travel_date ??
    new Date().toISOString().slice(0, 10);

  const notes =
    [input.notes, opportunity.notes].filter(Boolean).join("\n").trim() || null;

  if (input.package_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("first_name, last_name, company_name")
      .eq("id", opportunity.customer_id)
      .maybeSingle();
    if (!customer) throw new Error("Customer not found");

    const firstName = customer.first_name ?? customer.company_name ?? "Guest";
    const lastName = customer.last_name ?? "-";
    const travelers =
      input.travelers?.map((t) => ({
        first_name: t.first_name,
        last_name: t.last_name,
        tier: (t.tier ?? "adult") as TravelerInput["tier"],
      })) ?? defaultTravelers(firstName, lastName, opportunity.pax_count);

    const preview = await buildDraftPreview(supabase, {
      customer_id: opportunity.customer_id,
      package_id: input.package_id,
      travel_date: travelDate,
      travelers,
      notes: notes ?? undefined,
    });

    const { booking_id, reference_number } = await executeCreateDraft(
      supabase,
      tenantId,
      userId,
      preview
    );

    await supabase
      .from("bookings")
      .update({ opportunity_id: opportunityId })
      .eq("id", booking_id);

    return { booking_id, reference_number, mode: "package" };
  }

  const lineItems = input.line_items ?? [
    {
      description: opportunity.destination_text
        ? `Custom trip — ${opportunity.destination_text}`
        : `Custom trip — ${opportunity.opportunity_number}`,
      quantity: opportunity.pax_count,
      unit_price:
        opportunity.estimated_revenue != null
          ? Number(opportunity.estimated_revenue) / Math.max(opportunity.pax_count, 1)
          : 0,
    },
  ];

  const total = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      reference_number: "",
      customer_id: opportunity.customer_id,
      package_id: null,
      opportunity_id: opportunityId,
      status: "draft",
      payment_status: "unpaid",
      total_amount: total,
      currency: opportunity.currency,
      travel_date: travelDate,
      notes,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, reference_number")
    .single();

  if (bookingError || !booking) {
    throw new Error(bookingError?.message ?? "Failed to create custom booking draft");
  }

  for (const item of lineItems) {
    const { error: itemError } = await supabase.from("booking_items").insert({
      booking_id: booking.id,
      tenant_id: tenantId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
    if (itemError) throw new Error(itemError.message);
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("first_name, last_name, company_name")
    .eq("id", opportunity.customer_id)
    .maybeSingle();

  if (customer) {
    const firstName = customer.first_name ?? customer.company_name ?? "Guest";
    const lastName = customer.last_name ?? "-";
    const travelers =
      input.travelers?.map((t) => ({
        first_name: t.first_name,
        last_name: t.last_name,
        tier: (t.tier ?? "adult") as TravelerInput["tier"],
      })) ?? defaultTravelers(firstName, lastName, Math.min(opportunity.pax_count, 1));

    let leadSet = false;
    for (const traveler of travelers) {
      const travelerId = await ensureBookingTraveler(
        supabase,
        tenantId,
        userId,
        opportunity.customer_id,
        traveler
      );
      const isLead = !leadSet;
      if (isLead) leadSet = true;
      await supabase.from("booking_travelers").insert({
        booking_id: booking.id,
        traveler_id: travelerId,
        tenant_id: tenantId,
        is_lead: isLead,
        price_tier: traveler.tier,
      });
    }
  }

  return {
    booking_id: booking.id,
    reference_number: booking.reference_number,
    mode: "custom",
  };
}
