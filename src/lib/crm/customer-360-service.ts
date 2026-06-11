import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canReadCrmActivities,
  canReadCrmOpportunities,
  canWriteCrmActivities,
  canWriteCrmOpportunities,
} from "@/lib/auth/crm-rbac";
import { canReadCustomer360Financial } from "@/lib/auth/customers-permissions";
import {
  OPEN_OPPORTUNITY_STAGES,
  type Customer360Payload,
  type Customer360TimelinePage,
} from "@/lib/crm/customer-360-types";
import type {
  BookingSummary,
  Customer360Revenue,
  Customer360Summary,
  Customer360Tabs,
  InvoiceSummary,
  PaymentSummary,
  SupportTicketSummary,
} from "@/lib/crm/customer-360-types";
import {
  filterTimelineByBucket,
  timelineViewRowToEvent,
  type TimelineBucket,
  type TimelineEvent,
  type TimelineViewRow,
} from "@/lib/crm/timeline-events";
import { scopeActivityListParams, listActivities } from "@/lib/crm/activities-service";
import type { Customer, UserRole } from "@/types";

const TIMELINE_DEFAULT_LIMIT = 50;
const TIMELINE_MAX_LIMIT = 200;
const TIMELINE_PREVIEW_COUNT = 15;
const TAB_LIST_LIMIT = 50;
const FETCH_TIMEOUT_MS = 5000;

export interface TimelineCursorPayload {
  occurred_at: string;
  id: string;
}

export interface ListCustomerTimelineParams {
  limit?: number;
  cursor?: string | null;
  bucket?: TimelineBucket;
}

export function parseTimelineLimit(raw: number | undefined): number {
  const n = raw ?? TIMELINE_DEFAULT_LIMIT;
  if (!Number.isFinite(n) || n < 1) return TIMELINE_DEFAULT_LIMIT;
  return Math.min(Math.floor(n), TIMELINE_MAX_LIMIT);
}

export function encodeTimelineCursor(payload: TimelineCursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeTimelineCursor(cursor: string | null | undefined): TimelineCursorPayload | null {
  if (!cursor?.trim()) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    ) as TimelineCursorPayload;
    if (typeof parsed.occurred_at === "string" && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  label: string
): Promise<{ value: T; timedOut: boolean; label: string }> {
  try {
    const value = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("timeout")), FETCH_TIMEOUT_MS);
      }),
    ]);
    return { value, timedOut: false, label };
  } catch {
    return { value: fallback, timedOut: true, label };
  }
}

export async function getCustomerById(
  supabase: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", customerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Customer | null) ?? null;
}

export async function listCustomerTimeline(
  supabase: SupabaseClient,
  tenantId: string,
  customerId: string,
  params: ListCustomerTimelineParams
): Promise<Customer360TimelinePage> {
  const limit = parseTimelineLimit(params.limit);
  const bucket = params.bucket ?? "all";
  const cursor = decodeTimelineCursor(params.cursor);

  let query = supabase
    .from("v_customer_timeline_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (bucket !== "all") {
    query = query.eq("timeline_bucket", bucket);
  }

  if (cursor) {
    const ts = cursor.occurred_at;
    const id = cursor.id;
    query = query.or(
      `occurred_at.lt.${ts},and(occurred_at.eq.${ts},id.lt.${id})`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as TimelineViewRow[];
  const events = rows
    .map(timelineViewRowToEvent)
    .filter((e): e is TimelineEvent => e !== null);

  const filtered =
    bucket === "all" ? events : filterTimelineByBucket(events, bucket);

  const hasMore = filtered.length > limit;
  const page = hasMore ? filtered.slice(0, limit) : filtered;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeTimelineCursor({ occurred_at: last.occurred_at, id: last.id })
      : null;

  return {
    data: page,
    meta: {
      limit,
      has_more: hasMore,
      next_cursor: nextCursor,
      bucket,
    },
  };
}

async function fetchTimelinePreview(
  supabase: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<{ events: TimelineEvent[]; timedOut: boolean }> {
  const fallback: TimelineEvent[] = [];
  const result = await withTimeout(
    listCustomerTimeline(supabase, tenantId, customerId, {
      limit: TIMELINE_PREVIEW_COUNT,
      bucket: "all",
    }),
    {
      data: fallback,
      meta: {
        limit: TIMELINE_PREVIEW_COUNT,
        has_more: false,
        next_cursor: null,
        bucket: "all",
      },
    },
    "timeline_preview"
  );
  return {
    events: result.value.data,
    timedOut: result.timedOut,
  };
}

async function computeFinancialSummary(
  supabase: SupabaseClient,
  tenantId: string,
  bookingRowsInput: { id: string; total_amount: number; status: string }[],
  currency: string
): Promise<{
  summary: Pick<
    Customer360Summary,
    "total_revenue" | "outstanding_balance" | "lifetime_customer_value" | "ytd_revenue" | "avg_booking_value"
  >;
  revenue: Customer360Revenue;
}> {
  const bookingRows = bookingRowsInput;
  const bookingIds = bookingRows.map((b) => b.id);
  const activeBookings = bookingRows.filter((b) => b.status !== "cancelled");
  const totalBooked = activeBookings.reduce(
    (sum, b) => sum + Number(b.total_amount),
    0
  );

  let totalRevenue = 0;
  let ytdRevenue = 0;
  if (bookingIds.length > 0) {
    const yearStart = `${new Date().getUTCFullYear()}-01-01`;
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount, payment_date")
      .eq("tenant_id", tenantId)
      .in("booking_id", bookingIds)
      .is("deleted_at", null);

    if (paymentsError) throw new Error(paymentsError.message);

    for (const p of payments ?? []) {
      const amt = Number(p.amount);
      totalRevenue += amt;
      if (String(p.payment_date) >= yearStart) {
        ytdRevenue += amt;
      }
    }
  }

  const outstanding = Math.max(0, totalBooked - totalRevenue);
  const avgBooking =
    activeBookings.length > 0 ? totalBooked / activeBookings.length : 0;

  const revenue: Customer360Revenue = {
    lifetime_customer_value: totalRevenue,
    ytd_revenue: ytdRevenue,
    outstanding_balance: outstanding,
    avg_booking_value: avgBooking,
    currency,
  };

  return {
    summary: {
      total_revenue: totalRevenue,
      outstanding_balance: outstanding,
      lifetime_customer_value: totalRevenue,
      ytd_revenue: ytdRevenue,
      avg_booking_value: avgBooking,
    },
    revenue,
  };
}

export async function fetchCustomer360(
  supabase: SupabaseClient,
  tenantId: string,
  customerId: string,
  role: UserRole,
  userId: string
): Promise<Customer360Payload> {
  const customer = await getCustomerById(supabase, tenantId, customerId);
  if (!customer) {
    throw Object.assign(new Error("Customer not found"), { code: "NOT_FOUND" });
  }

  const includeFinancial = canReadCustomer360Financial(role);
  const includeOpportunities = canReadCrmOpportunities(role);
  const includeActivities = canReadCrmActivities(role);
  const currency = "USD";

  const warnings: { code: string; message: string }[] = [];

  const [
    contactsResult,
    addressesResult,
    bookingsResult,
    timelinePreviewResult,
    ticketsResult,
  ] = await Promise.all([
    supabase
      .from("customer_contacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_addresses")
      .select("*, countries(*), cities(*)")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, reference_number, status, payment_status, total_amount, currency, travel_date, created_at, packages(title)")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(TAB_LIST_LIMIT),
    fetchTimelinePreview(supabase, tenantId, customerId),
    supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, status, priority, created_at")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(TAB_LIST_LIMIT),
  ]);

  if (contactsResult.error) throw new Error(contactsResult.error.message);
  if (addressesResult.error) throw new Error(addressesResult.error.message);
  if (bookingsResult.error) throw new Error(bookingsResult.error.message);
  if (ticketsResult.error) throw new Error(ticketsResult.error.message);

  if (timelinePreviewResult.timedOut) {
    warnings.push({
      code: "TIMELINE_PARTIAL",
      message: "Timeline preview could not be loaded in time",
    });
  }

  const bookingRows = bookingsResult.data ?? [];
  const bookingSummaries: BookingSummary[] = bookingRows.map((row) => {
    const pkg = row.packages as { title?: string } | null;
    return {
      id: row.id as string,
      reference_number: row.reference_number as string,
      status: row.status as BookingSummary["status"],
      payment_status: row.payment_status as BookingSummary["payment_status"],
      total_amount: Number(row.total_amount),
      currency: row.currency as string,
      travel_date: (row.travel_date as string | null) ?? null,
      created_at: row.created_at as string,
      package_title: pkg?.title ?? null,
    };
  });

  const confirmedCount = bookingSummaries.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  ).length;

  let opportunities: Customer360Tabs["opportunities"] = [];
  let openOpportunityCount = 0;
  let weightedPipeline: number | null = null;

  if (includeOpportunities) {
    const { data: opps, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(TAB_LIST_LIMIT);

    if (oppError) throw new Error(oppError.message);
    opportunities = (opps ?? []) as Customer360Tabs["opportunities"];
    const open = opportunities.filter((o) =>
      (OPEN_OPPORTUNITY_STAGES as readonly string[]).includes(o.stage)
    );
    openOpportunityCount = open.length;
    weightedPipeline = open.reduce((sum, o) => {
      const rev = Number(o.estimated_revenue ?? 0);
      const prob = Number(o.probability ?? 0);
      return sum + (rev * prob) / 100;
    }, 0);
  }

  let activities: Customer360Tabs["activities"] = [];
  if (includeActivities) {
    const scoped = scopeActivityListParams(role, userId, {
      customer_id: customerId,
      limit: TAB_LIST_LIMIT,
      view: "timeline",
    });
    const actResult = await listActivities(supabase, tenantId, scoped);
    activities = actResult.data;
  }


  let invoices: InvoiceSummary[] = [];
  let payments: PaymentSummary[] = [];
  let revenue: Customer360Revenue | undefined;

  const bookingIds = bookingSummaries.map((b) => b.id);
  if (bookingIds.length > 0) {
    const [invResult, payResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, booking_id, status, total_amount, due_date, currency, bookings(reference_number)")
        .eq("tenant_id", tenantId)
        .in("booking_id", bookingIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(TAB_LIST_LIMIT),
      supabase
        .from("payments")
        .select("id, amount, method, payment_date, reference_number, booking_id, invoice_id")
        .eq("tenant_id", tenantId)
        .in("booking_id", bookingIds)
        .is("deleted_at", null)
        .order("payment_date", { ascending: false })
        .limit(TAB_LIST_LIMIT),
    ]);

    if (invResult.error) throw new Error(invResult.error.message);
    if (payResult.error) throw new Error(payResult.error.message);

    const payByInvoice = new Map<string, number>();
    for (const p of payResult.data ?? []) {
      const invId = p.invoice_id as string | null;
      if (invId) {
        payByInvoice.set(invId, (payByInvoice.get(invId) ?? 0) + Number(p.amount));
      }
    }

    invoices = (invResult.data ?? []).map((row) => {
      const booking = row.bookings as { reference_number?: string } | null;
      const id = row.id as string;
      const total = Number(row.total_amount);
      const paid = payByInvoice.get(id) ?? 0;
      return {
        id,
        invoice_number: row.invoice_number as string,
        booking_id: row.booking_id as string,
        booking_reference: booking?.reference_number ?? null,
        status: row.status as InvoiceSummary["status"],
        total_amount: total,
        paid_amount: paid,
        due_date: (row.due_date as string | null) ?? null,
        currency: row.currency as string,
      };
    });

    payments = (payResult.data ?? []).map((row) => ({
      id: row.id as string,
      amount: Number(row.amount),
      method: row.method as PaymentSummary["method"],
      payment_date: row.payment_date as string,
      reference_number: (row.reference_number as string | null) ?? null,
      booking_id: row.booking_id as string,
      invoice_id: (row.invoice_id as string | null) ?? null,
    }));
  }

  const summary: Customer360Summary = {
    booking_count: bookingSummaries.length,
    confirmed_booking_count: confirmedCount,
    open_opportunity_count: openOpportunityCount,
    weighted_pipeline: includeOpportunities ? weightedPipeline : null,
    activity_count: customer.activity_count ?? 0,
    last_activity_at: customer.last_activity_at ?? null,
    currency,
  };

  if (includeFinancial) {
    const fin = await computeFinancialSummary(
      supabase,
      tenantId,
      bookingSummaries.map((b) => ({
        id: b.id,
        total_amount: b.total_amount,
        status: b.status,
      })),
      currency
    );
    Object.assign(summary, fin.summary);
    revenue = fin.revenue;
  }

  const tickets: SupportTicketSummary[] = (ticketsResult.data ?? []).map((row) => ({
    id: row.id as string,
    ticket_number: row.ticket_number as string,
    subject: row.subject as string,
    status: row.status as string,
    priority: row.priority as string,
    created_at: row.created_at as string,
  }));

  const tabs: Customer360Tabs = {
    bookings: bookingSummaries,
    invoices,
    payments,
    tickets,
    activities,
    opportunities,
    ...(revenue ? { revenue } : {}),
  };

  return {
    customer,
    contacts: contactsResult.data ?? [],
    addresses: addressesResult.data ?? [],
    summary,
    tabs,
    timeline_preview: timelinePreviewResult.events,
    meta: {
      ...(warnings.length > 0 ? { warnings } : {}),
      permissions: {
        financial: includeFinancial,
        crm_opportunities: includeOpportunities,
        crm_activities: includeActivities,
        crm_write_activity: canWriteCrmActivities(role),
        crm_write_opportunity: canWriteCrmOpportunities(role),
      },
    },
  };
}
