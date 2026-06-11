import type { SupabaseClient } from "@supabase/supabase-js";
import { hasCrmPermission } from "@/lib/auth/crm-rbac";
import {
  assertTransition,
  canEditQuotation,
  isQuotationExpired,
  QuotationTransitionError,
} from "@/lib/crm/quotation-lifecycle";
import { getOpportunityById } from "@/lib/crm/opportunities-service";
import type {
  QuotationCreateInput,
  QuotationItemInput,
  QuotationUpdateInput,
} from "@/lib/validation/quotation";
import type {
  Quotation,
  QuotationApprovalMode,
  QuotationItem,
  QuotationStatus,
  UserRole,
} from "@/types";

export interface TenantQuotationSettings {
  quotation_approval_mode: QuotationApprovalMode;
  quotation_default_valid_days: number;
  quotation_terms_default: string | null;
}

export interface ListQuotationsParams {
  opportunity_id?: string;
  customer_id?: string;
  status?: string;
  owner_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getTenantQuotationSettings(
  supabase: SupabaseClient,
  tenantId: string
): Promise<TenantQuotationSettings> {
  const { data, error } = await supabase
    .from("tenant_settings")
    .select(
      "quotation_approval_mode, quotation_default_valid_days, quotation_terms_default"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    quotation_approval_mode:
      (data?.quotation_approval_mode as QuotationApprovalMode) ?? "simple",
    quotation_default_valid_days: data?.quotation_default_valid_days ?? 14,
    quotation_terms_default: data?.quotation_terms_default ?? null,
  };
}

export function assertQuotationWriteAccess(
  role: UserRole,
  quotation: Quotation,
  userId: string
): void {
  const writeAll = hasCrmPermission(role, "crm.quotations.write_all");
  if (writeAll) return;
  if (
    hasCrmPermission(role, "crm.quotations.write") &&
    quotation.owner_id === userId
  ) {
    return;
  }
  throw new Error("Forbidden");
}

async function loadItems(
  supabase: SupabaseClient,
  quotationId: string
): Promise<QuotationItem[]> {
  const { data, error } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", quotationId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as QuotationItem[];
}

export async function getQuotationById(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  withItems = true
): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Quotation not found");
  const quotation = data as Quotation;
  if (withItems) {
    quotation.items = await loadItems(supabase, id);
  }
  return quotation;
}

export async function listQuotations(
  supabase: SupabaseClient,
  tenantId: string,
  params: ListQuotationsParams
): Promise<{ data: Quotation[]; total: number }> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("quotations")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.opportunity_id) query = query.eq("opportunity_id", params.opportunity_id);
  if (params.customer_id) query = query.eq("customer_id", params.customer_id);
  if (params.status) query = query.eq("status", params.status);
  if (params.owner_id) query = query.eq("owner_id", params.owner_id);
  if (params.search?.trim()) {
    const term = `%${params.search.trim().replace(/,/g, " ")}%`;
    query = query.ilike("quotation_number", term);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as Quotation[], total: count ?? 0 };
}

async function assertNoActiveAcceptedQuote(
  supabase: SupabaseClient,
  tenantId: string,
  opportunityId: string,
  excludeId?: string
): Promise<void> {
  let query = supabase
    .from("quotations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("opportunity_id", opportunityId)
    .is("deleted_at", null)
    .in("status", ["accepted", "converted_to_booking"]);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    throw new QuotationTransitionError(
      "ACTIVE_QUOTATION_EXISTS",
      "This opportunity already has an accepted quotation"
    );
  }
}

function defaultValidUntil(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function createQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  input: QuotationCreateInput
): Promise<Quotation> {
  const opportunity = await getOpportunityById(
    supabase,
    tenantId,
    input.opportunity_id
  );
  if (opportunity.stage === "closed_lost") {
    throw new QuotationTransitionError(
      "OPPORTUNITY_CLOSED",
      "Cannot create quotation for a closed-lost opportunity"
    );
  }

  const settings = await getTenantQuotationSettings(supabase, tenantId);
  let customerId = input.customer_id ?? opportunity.customer_id ?? null;
  let currency = input.currency ?? opportunity.currency;
  let notes = input.notes ?? null;
  let terms =
    input.terms_and_conditions ?? settings.quotation_terms_default ?? null;

  if (input.source_quotation_id) {
    const source = await getQuotationById(
      supabase,
      tenantId,
      input.source_quotation_id,
      true
    );
    if (!input.items?.length && source.items?.length) {
      input.items = source.items.map((row) => ({
        item_type: row.item_type,
        description: row.description,
        package_id: row.package_id,
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        sort_order: row.sort_order,
      }));
    }
    customerId = customerId ?? source.customer_id ?? null;
    currency = input.currency ?? source.currency;
    notes = notes ?? source.notes ?? null;
    terms = terms ?? source.terms_and_conditions ?? null;
  }

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      tenant_id: tenantId,
      opportunity_id: input.opportunity_id,
      customer_id: customerId,
      currency,
      valid_until:
        input.valid_until ??
        defaultValidUntil(settings.quotation_default_valid_days),
      notes,
      terms_and_conditions: terms,
      discount_amount: input.discount_amount ?? 0,
      tax_amount: input.tax_amount ?? 0,
      owner_id: opportunity.owner_id,
      source_quotation_id: input.source_quotation_id ?? null,
      status: "draft",
      created_by: userId,
      updated_by: userId,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const quotation = data as Quotation;

  if (input.items?.length) {
    for (const [index, item] of input.items.entries()) {
      await addQuotationItem(supabase, tenantId, quotation.id, item, index);
    }
  }

  return getQuotationById(supabase, tenantId, quotation.id, true);
}

export async function updateQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  input: QuotationUpdateInput,
  role: UserRole
): Promise<Quotation> {
  const quotation = await getQuotationById(supabase, tenantId, id, false);
  if (!canEditQuotation(quotation.status, hasCrmPermission(role, "crm.quotations.write_all"))) {
    throw new QuotationTransitionError(
      "QUOTATION_NOT_EDITABLE",
      "Quotation can only be edited in draft or pending approval"
    );
  }

  const patch: Record<string, unknown> = { ...input };
  const { error } = await supabase
    .from("quotations")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);

  if (input.discount_amount !== undefined || input.tax_amount !== undefined) {
    await supabase.rpc("recalculate_quotation_totals", { p_quotation_id: id });
  }

  return getQuotationById(supabase, tenantId, id, true);
}

export async function softDeleteQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<void> {
  const quotation = await getQuotationById(supabase, tenantId, id, false);
  if (!["draft", "rejected", "expired"].includes(quotation.status)) {
    throw new QuotationTransitionError(
      "QUOTATION_DELETE_FORBIDDEN",
      "Only draft, rejected, or expired quotations can be deleted"
    );
  }
  const { error } = await supabase
    .from("quotations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function addQuotationItem(
  supabase: SupabaseClient,
  tenantId: string,
  quotationId: string,
  input: QuotationItemInput,
  sortOrder?: number
): Promise<QuotationItem> {
  const quotation = await getQuotationById(supabase, tenantId, quotationId, false);
  if (quotation.status !== "draft" && quotation.status !== "pending_approval") {
    throw new QuotationTransitionError(
      "QUOTATION_NOT_EDITABLE",
      "Items can only be changed on draft quotations"
    );
  }
  const lineTotal = Number(input.quantity) * Number(input.unit_price);
  const { data, error } = await supabase
    .from("quotation_items")
    .insert({
      tenant_id: tenantId,
      quotation_id: quotationId,
      item_type: input.item_type,
      description: input.description,
      package_id: input.package_id ?? null,
      quantity: input.quantity,
      unit_price: input.unit_price,
      line_total: lineTotal,
      sort_order: input.sort_order ?? sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as QuotationItem;
}

export async function updateQuotationItem(
  supabase: SupabaseClient,
  tenantId: string,
  quotationId: string,
  itemId: string,
  input: Partial<QuotationItemInput>
): Promise<QuotationItem> {
  const quotation = await getQuotationById(supabase, tenantId, quotationId, false);
  if (quotation.status !== "draft" && quotation.status !== "pending_approval") {
    throw new QuotationTransitionError("QUOTATION_NOT_EDITABLE", "Items locked");
  }
  const patch: Record<string, unknown> = { ...input };
  if (input.quantity !== undefined && input.unit_price !== undefined) {
    patch.line_total = Number(input.quantity) * Number(input.unit_price);
  } else if (input.quantity !== undefined || input.unit_price !== undefined) {
    const { data: existing } = await supabase
      .from("quotation_items")
      .select("quantity, unit_price")
      .eq("id", itemId)
      .single();
    if (existing) {
      const q = input.quantity ?? existing.quantity;
      const p = input.unit_price ?? existing.unit_price;
      patch.line_total = Number(q) * Number(p);
    }
  }
  const { data, error } = await supabase
    .from("quotation_items")
    .update(patch)
    .eq("id", itemId)
    .eq("quotation_id", quotationId)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as QuotationItem;
}

export async function deleteQuotationItem(
  supabase: SupabaseClient,
  tenantId: string,
  quotationId: string,
  itemId: string
): Promise<void> {
  const quotation = await getQuotationById(supabase, tenantId, quotationId, false);
  if (quotation.status !== "draft" && quotation.status !== "pending_approval") {
    throw new QuotationTransitionError("QUOTATION_NOT_EDITABLE", "Items locked");
  }
  const { error } = await supabase
    .from("quotation_items")
    .delete()
    .eq("id", itemId)
    .eq("quotation_id", quotationId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function expireQuotationIfNeeded(
  supabase: SupabaseClient,
  quotation: Quotation
): Promise<Quotation> {
  if (
    isQuotationExpired(quotation.valid_until) &&
    ["sent", "viewed", "draft", "approved"].includes(quotation.status)
  ) {
    const { data, error } = await supabase
      .from("quotations")
      .update({ status: "expired" })
      .eq("id", quotation.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Quotation;
  }
  return quotation;
}

async function transitionQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  to: QuotationStatus,
  patch: Record<string, unknown> = {}
): Promise<Quotation> {
  let quotation = await getQuotationById(supabase, tenantId, id, true);
  quotation = await expireQuotationIfNeeded(supabase, quotation);
  const settings = await getTenantQuotationSettings(supabase, tenantId);
  assertTransition(quotation.status, to, settings.quotation_approval_mode);

  const { data, error } = await supabase
    .from("quotations")
    .update({ status: to, ...patch })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const updated = data as Quotation;
  updated.items = quotation.items;
  return updated;
}

export async function sendQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Quotation> {
  const quotation = await getQuotationById(supabase, tenantId, id, true);
  const settings = await getTenantQuotationSettings(supabase, tenantId);

  if (!quotation.customer_id) {
    throw new QuotationTransitionError(
      "CUSTOMER_REQUIRED",
      "Link a customer before sending the quotation"
    );
  }
  if (!quotation.items?.length) {
    throw new QuotationTransitionError(
      "ITEMS_REQUIRED",
      "Add at least one line item before sending"
    );
  }
  if (Number(quotation.total_amount) <= 0) {
    throw new QuotationTransitionError(
      "VALIDATION_ERROR",
      "Quotation total must be greater than zero"
    );
  }

  const from =
    settings.quotation_approval_mode === "simple" ? "draft" : "approved";
  assertTransition(quotation.status, "sent", settings.quotation_approval_mode);
  if (quotation.status !== from && quotation.status !== "sent") {
    throw new QuotationTransitionError(
      "QUOTATION_TRANSITION_INVALID",
      settings.quotation_approval_mode === "simple"
        ? "Send requires draft status"
        : "Send requires approved status"
    );
  }

  return transitionQuotation(supabase, tenantId, id, "sent", {
    sent_at: new Date().toISOString(),
  });
}

export async function markQuotationViewed(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Quotation> {
  const quotation = await getQuotationById(supabase, tenantId, id, false);
  if (quotation.status === "viewed" && quotation.viewed_at) {
    return quotation;
  }
  if (quotation.status === "sent") {
    return transitionQuotation(supabase, tenantId, id, "viewed", {
      viewed_at: new Date().toISOString(),
    });
  }
  if (quotation.status === "viewed") {
    return quotation;
  }
  throw new QuotationTransitionError(
    "QUOTATION_TRANSITION_INVALID",
    "Mark viewed requires sent status"
  );
}

export async function acceptQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Quotation> {
  const quotation = await expireQuotationIfNeeded(
    supabase,
    await getQuotationById(supabase, tenantId, id, false)
  );
  if (quotation.status === "expired") {
    throw new QuotationTransitionError("QUOTATION_EXPIRED", "Quotation has expired");
  }
  await assertNoActiveAcceptedQuote(
    supabase,
    tenantId,
    quotation.opportunity_id,
    id
  );

  const updated = await transitionQuotation(supabase, tenantId, id, "accepted", {
    accepted_at: new Date().toISOString(),
  });

  await supabase
    .from("opportunities")
    .update({ stage: "verbal_approval" })
    .eq("id", quotation.opportunity_id)
    .eq("tenant_id", tenantId)
    .in("stage", ["discovery", "proposal", "negotiation"]);

  return updated;
}

export async function rejectQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  reason?: string
): Promise<Quotation> {
  return transitionQuotation(supabase, tenantId, id, "rejected", {
    rejected_at: new Date().toISOString(),
    rejection_reason: reason ?? null,
  });
}

export async function submitQuotationApproval(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Quotation> {
  const settings = await getTenantQuotationSettings(supabase, tenantId);
  if (settings.quotation_approval_mode !== "standard") {
    throw new QuotationTransitionError(
      "APPROVAL_MODE_SIMPLE",
      "Tenant uses simple approval mode"
    );
  }
  const quotation = await getQuotationById(supabase, tenantId, id, true);
  if (!quotation.items?.length) {
    throw new QuotationTransitionError("ITEMS_REQUIRED", "Add line items first");
  }
  return transitionQuotation(supabase, tenantId, id, "pending_approval");
}

export async function approveQuotation(
  supabase: SupabaseClient,
  tenantId: string,
  id: string,
  approverId: string
): Promise<Quotation> {
  return transitionQuotation(supabase, tenantId, id, "approved", {
    approved_by: approverId,
    approved_at: new Date().toISOString(),
  });
}

export async function rejectQuotationApproval(
  supabase: SupabaseClient,
  tenantId: string,
  id: string
): Promise<Quotation> {
  const settings = await getTenantQuotationSettings(supabase, tenantId);
  const quotation = await getQuotationById(supabase, tenantId, id, false);
  assertTransition(quotation.status, "draft", settings.quotation_approval_mode);
  const { data, error } = await supabase
    .from("quotations")
    .update({
      status: "draft",
      approved_by: null,
      approved_at: null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Quotation;
}

export async function convertQuotationToBooking(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string | null,
  id: string
): Promise<{ quotation: Quotation; booking_id: string; reference_number: string }> {
  const quotation = await getQuotationById(supabase, tenantId, id, true);
  if (quotation.status !== "accepted") {
    throw new QuotationTransitionError(
      "QUOTATION_NOT_ACCEPTED",
      "Only accepted quotations can be converted"
    );
  }
  if (quotation.booking_id) {
    throw new QuotationTransitionError(
      "ALREADY_CONVERTED",
      "Quotation is already linked to a booking"
    );
  }
  if (!quotation.customer_id) {
    throw new QuotationTransitionError(
      "CUSTOMER_REQUIRED",
      "Quotation must have a customer"
    );
  }

  const opportunity = await getOpportunityById(
    supabase,
    tenantId,
    quotation.opportunity_id
  );

  const lineItems =
    quotation.items?.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
    })) ?? [];

  const packageItem = quotation.items?.find((i) => i.package_id);
  const total = Number(quotation.total_amount);

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      reference_number: "",
      customer_id: quotation.customer_id,
      package_id: packageItem?.package_id ?? null,
      opportunity_id: quotation.opportunity_id,
      quotation_id: quotation.id,
      status: "draft",
      payment_status: "unpaid",
      total_amount: total,
      currency: quotation.currency,
      travel_date: opportunity.expected_travel_date,
      notes: [quotation.notes, `From ${quotation.quotation_number}`]
        .filter(Boolean)
        .join("\n"),
      created_by: userId ?? null,
      updated_by: userId ?? null,
    })
    .select("id, reference_number")
    .single();

  if (bookingError || !booking) {
    throw new Error(bookingError?.message ?? "Failed to create booking");
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

  const { data: updatedQuote, error: quoteError } = await supabase
    .from("quotations")
    .update({
      status: "converted_to_booking",
      booking_id: booking.id,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();
  if (quoteError) throw new Error(quoteError.message);

  return {
    quotation: updatedQuote as Quotation,
    booking_id: booking.id,
    reference_number: booking.reference_number,
  };
}
