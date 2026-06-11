import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PORTAL_OPEN_QUOTATION_STATUSES,
  PORTAL_VISIBLE_QUOTATION_STATUSES,
} from "@/lib/portal/constants";
import type { Quotation, QuotationItem } from "@/types";

const LIST_SELECT =
  "id, tenant_id, quotation_number, customer_id, status, valid_until, currency, subtotal, discount_amount, tax_amount, total_amount, sent_at, viewed_at, accepted_at, rejected_at, created_at, updated_at";

const DETAIL_SELECT = `${LIST_SELECT}, notes, terms_and_conditions, rejection_reason, booking_id`;

export interface PortalQuotationListItem extends Quotation {}

export interface PortalQuotationDetail extends PortalQuotationListItem {
  items: QuotationItem[];
}

export async function listPortalQuotations(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<{ data: PortalQuotationListItem[]; total: number }> {
  const page = params.page ?? 1;
  const limit = Math.min(params.limit ?? 20, 50);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("quotations")
    .select(LIST_SELECT, { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", PORTAL_VISIBLE_QUOTATION_STATUSES)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return { data: (data ?? []) as PortalQuotationListItem[], total: count ?? 0 };
}

export async function getPortalQuotationById(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string,
  quotationId: string
): Promise<PortalQuotationDetail> {
  const { data: quotation, error } = await supabase
    .from("quotations")
    .select(DETAIL_SELECT)
    .eq("id", quotationId)
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", PORTAL_VISIBLE_QUOTATION_STATUSES)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!quotation) {
    throw Object.assign(new Error("Quotation not found"), { code: "NOT_FOUND" });
  }

  const { data: items, error: itemsError } = await supabase
    .from("quotation_items")
    .select(
      "id, tenant_id, quotation_id, sort_order, item_type, description, package_id, quantity, unit_price, line_total, created_at, updated_at"
    )
    .eq("quotation_id", quotationId)
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return {
    ...(quotation as PortalQuotationListItem),
    items: (items ?? []) as QuotationItem[],
  };
}

export async function countOpenPortalQuotations(
  supabase: SupabaseClient,
  customerId: string,
  tenantId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .in("status", PORTAL_OPEN_QUOTATION_STATUSES)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
