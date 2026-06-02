import { SupabaseClient } from "@supabase/supabase-js";
import { textMatchesHint } from "@/lib/ai/booking-intent";
import { PricingTier } from "@/types";
import { TravelerInput } from "@/lib/validation/booking-agent";

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export interface PackageSearchFilters {
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  travelDate?: string;
}

export interface PackageSearchResult {
  id: string;
  title: string;
  description?: string;
  duration_days?: number;
  destination_name?: string;
  adult_price?: number;
  currency?: string;
  status: string;
}

export interface CustomerSearchResult {
  id: string;
  label: string;
  email?: string;
  phone?: string;
}

export interface BookingDetailResult {
  id: string;
  reference_number: string;
  status: string;
  payment_status: string;
  travel_date?: string;
  total_amount: number;
  currency: string;
  customer_name?: string;
  package_title?: string;
  travelers: { name: string; tier: string; is_lead: boolean }[];
}

export interface PricingLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tier: PricingTier;
}

export interface DraftPreview {
  customer_id: string;
  package_id: string;
  travel_date: string;
  travelers: TravelerInput[];
  line_items: PricingLineItem[];
  total_amount: number;
  currency: string;
  package_title: string;
  customer_name: string;
  notes?: string;
}

export async function searchPackages(
  supabase: SupabaseClient,
  filters: PackageSearchFilters
): Promise<PackageSearchResult[]> {
  let query = supabase
    .from("packages")
    .select(
      "id, title, description, duration_days, status, destinations(name), package_pricing(tier, amount, currency)"
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(20);

  const { data, error } = await query;
  if (error || !data) return [];

  let results = data.map((pkg) => {
    const pricing = (pkg.package_pricing ?? []) as {
      tier: string;
      amount: number;
      currency: string;
    }[];
    const adult = pricing.find((p) => p.tier === "adult");
    const dest = pkg.destinations as { name?: string } | null;

    return {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description ?? undefined,
      duration_days: pkg.duration_days ?? undefined,
      destination_name: dest?.name,
      adult_price: adult ? Number(adult.amount) : undefined,
      currency: adult?.currency ?? "USD",
      status: pkg.status,
    } satisfies PackageSearchResult;
  });

  if (filters.destination) {
    results = results.filter(
      (p) =>
        textMatchesHint(p.destination_name, filters.destination!) ||
        textMatchesHint(p.title, filters.destination!) ||
        textMatchesHint(p.description, filters.destination!)
    );
  }

  if (filters.minPrice !== undefined) {
    results = results.filter((p) => (p.adult_price ?? 0) >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    results = results.filter((p) => (p.adult_price ?? Infinity) <= filters.maxPrice!);
  }

  if (filters.travelDate) {
    const travel = new Date(filters.travelDate);
    if (!Number.isNaN(travel.getTime()) && travel < new Date()) {
      return [];
    }
  }

  return results.slice(0, 10);
}

export async function searchCustomers(
  supabase: SupabaseClient,
  queryText: string
): Promise<CustomerSearchResult[]> {
  const q = queryText.trim();
  if (q.length < 2) return [];

  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name, company_name, email, phone")
    .is("deleted_at", null)
    .or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`
    )
    .limit(10);

  return (data ?? []).map((c) => ({
    id: c.id,
    label:
      c.company_name ??
      [c.first_name, c.last_name].filter(Boolean).join(" ") ??
      c.email ??
      c.id,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
  }));
}

export async function lookupBooking(
  supabase: SupabaseClient,
  reference: string
): Promise<BookingDetailResult | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `id, reference_number, status, payment_status, travel_date, total_amount, currency,
       customers(first_name, last_name, company_name),
       packages(title),
       booking_travelers(is_lead, price_tier, travelers(first_name, last_name))`
    )
    .ilike("reference_number", reference)
    .is("deleted_at", null)
    .maybeSingle();

  if (!booking) return null;

  const customer = unwrapJoin(booking.customers) as {
    first_name?: string;
    last_name?: string;
    company_name?: string;
  } | null;
  const pkg = unwrapJoin(booking.packages) as { title?: string } | null;
  const bTravelers = booking.booking_travelers ?? [];

  return {
    id: booking.id,
    reference_number: booking.reference_number,
    status: booking.status,
    payment_status: booking.payment_status,
    travel_date: booking.travel_date ?? undefined,
    total_amount: Number(booking.total_amount),
    currency: booking.currency,
    customer_name:
      customer?.company_name ??
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" "),
    package_title: pkg?.title,
    travelers: bTravelers.map((bt) => {
      const traveler = unwrapJoin(bt.travelers) as {
        first_name: string;
        last_name: string;
      } | null;
      return {
        name: traveler
          ? `${traveler.first_name} ${traveler.last_name}`
          : "Unknown",
        tier: bt.price_tier,
        is_lead: bt.is_lead,
      };
    }),
  };
}

export async function getPackagePricing(
  supabase: SupabaseClient,
  packageId: string
): Promise<{ tier: PricingTier; amount: number; currency: string }[]> {
  const { data } = await supabase
    .from("package_pricing")
    .select("tier, amount, currency")
    .eq("package_id", packageId);

  return (data ?? []).map((row) => ({
    tier: row.tier as PricingTier,
    amount: Number(row.amount),
    currency: row.currency,
  }));
}

export async function validatePackageAvailable(
  supabase: SupabaseClient,
  packageId: string
): Promise<{ ok: boolean; message?: string; title?: string }> {
  const { data: pkg } = await supabase
    .from("packages")
    .select("id, title, status")
    .eq("id", packageId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!pkg) return { ok: false, message: "Package not found." };
  if (pkg.status !== "published") {
    return { ok: false, message: "Only published packages can be booked.", title: pkg.title };
  }

  const pricing = await getPackagePricing(supabase, packageId);
  if (pricing.length === 0) {
    return { ok: false, message: "Package has no pricing tiers configured.", title: pkg.title };
  }

  return { ok: true, title: pkg.title };
}

export function buildPricingLineItems(
  packageTitle: string,
  travelers: TravelerInput[],
  pricing: { tier: PricingTier; amount: number; currency: string }[]
): PricingLineItem[] {
  const tierCounts = travelers.reduce(
    (acc, t) => {
      acc[t.tier] = (acc[t.tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<PricingTier, number>
  );

  const items: PricingLineItem[] = [];

  for (const [tier, count] of Object.entries(tierCounts) as [PricingTier, number][]) {
    const priceRow = pricing.find((p) => p.tier === tier) ?? pricing.find((p) => p.tier === "adult");
    if (!priceRow || count === 0) continue;

    items.push({
      description: `${packageTitle} — ${tier}`,
      quantity: count,
      unit_price: priceRow.amount,
      total_price: priceRow.amount * count,
      tier,
    });
  }

  return items;
}

export async function buildDraftPreview(
  supabase: SupabaseClient,
  input: {
    customer_id: string;
    package_id: string;
    travel_date: string;
    travelers: TravelerInput[];
    notes?: string;
  }
): Promise<DraftPreview> {
  const availability = await validatePackageAvailable(supabase, input.package_id);
  if (!availability.ok) {
    throw new Error(availability.message);
  }

  const travelDate = new Date(input.travel_date);
  if (Number.isNaN(travelDate.getTime()) || travelDate < new Date(new Date().toDateString())) {
    throw new Error("Travel date must be today or in the future.");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("first_name, last_name, company_name")
    .eq("id", input.customer_id)
    .maybeSingle();

  if (!customer) throw new Error("Customer not found.");

  const pricing = await getPackagePricing(supabase, input.package_id);
  const lineItems = buildPricingLineItems(availability.title ?? "Package", input.travelers, pricing);
  const total = lineItems.reduce((sum, item) => sum + item.total_price, 0);

  return {
    customer_id: input.customer_id,
    package_id: input.package_id,
    travel_date: input.travel_date,
    travelers: input.travelers,
    line_items: lineItems,
    total_amount: total,
    currency: pricing[0]?.currency ?? "USD",
    package_title: availability.title ?? "Package",
    customer_name:
      customer.company_name ??
      [customer.first_name, customer.last_name].filter(Boolean).join(" "),
    notes: input.notes,
  };
}

async function ensureTraveler(
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
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create traveler");
  }

  return data.id;
}

export async function executeCreateDraft(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  preview: DraftPreview
): Promise<{ booking_id: string; reference_number: string }> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      reference_number: "",
      customer_id: preview.customer_id,
      package_id: preview.package_id,
      status: "draft",
      payment_status: "unpaid",
      total_amount: preview.total_amount,
      currency: preview.currency,
      travel_date: preview.travel_date,
      notes: preview.notes,
      created_by: userId,
      updated_by: userId,
    })
    .select("id, reference_number")
    .single();

  if (bookingError || !booking) {
    throw new Error(bookingError?.message ?? "Failed to create booking draft");
  }

  for (const item of preview.line_items) {
    const { error: itemError } = await supabase.from("booking_items").insert({
      booking_id: booking.id,
      tenant_id: tenantId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    });

    if (itemError) throw new Error(itemError.message);
  }

  let leadSet = false;
  for (const traveler of preview.travelers) {
    const travelerId = await ensureTraveler(
      supabase,
      tenantId,
      userId,
      preview.customer_id,
      traveler
    );
    const isLead = !leadSet;
    if (isLead) leadSet = true;

    const { error: linkError } = await supabase.from("booking_travelers").insert({
      booking_id: booking.id,
      traveler_id: travelerId,
      tenant_id: tenantId,
      is_lead: isLead,
      price_tier: traveler.tier,
    });

    if (linkError) throw new Error(linkError.message);
  }

  return { booking_id: booking.id, reference_number: booking.reference_number };
}

export async function executeUpdateDraft(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  input: {
    booking_id: string;
    travel_date?: string;
    package_id?: string;
    travelers?: TravelerInput[];
    notes?: string;
  }
): Promise<{ booking_id: string; reference_number: string }> {
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, reference_number, status, customer_id, package_id, travel_date")
    .eq("id", input.booking_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!existing) throw new Error("Booking not found.");
  if (existing.status !== "draft") {
    throw new Error("Only draft bookings can be modified by the agent.");
  }

  const packageId = input.package_id ?? existing.package_id;
  const travelDate = input.travel_date ?? existing.travel_date;

  if (input.package_id || input.travelers) {
    const travelers =
      input.travelers ??
      (await loadBookingTravelers(supabase, input.booking_id)).map((t) => ({
        first_name: t.first_name,
        last_name: t.last_name,
        tier: t.tier as PricingTier,
        traveler_id: t.traveler_id,
      }));

    const preview = await buildDraftPreview(supabase, {
      customer_id: existing.customer_id,
      package_id: packageId,
      travel_date: travelDate ?? new Date().toISOString().slice(0, 10),
      travelers,
      notes: input.notes,
    });

    await supabase.from("booking_items").delete().eq("booking_id", input.booking_id);
    await supabase.from("booking_travelers").delete().eq("booking_id", input.booking_id);

    for (const item of preview.line_items) {
      await supabase.from("booking_items").insert({
        booking_id: input.booking_id,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });
    }

    let leadSet = false;
    for (const traveler of preview.travelers) {
      const travelerId = await ensureTraveler(
        supabase,
        tenantId,
        userId,
        existing.customer_id,
        traveler
      );
      const isLead = !leadSet;
      if (isLead) leadSet = true;

      await supabase.from("booking_travelers").insert({
        booking_id: input.booking_id,
        traveler_id: travelerId,
        tenant_id: tenantId,
        is_lead: isLead,
        price_tier: traveler.tier,
      });
    }

    await supabase
      .from("bookings")
      .update({
        package_id: packageId,
        travel_date: travelDate,
        total_amount: preview.total_amount,
        currency: preview.currency,
        notes: input.notes,
        updated_by: userId,
      })
      .eq("id", input.booking_id);
  } else {
    await supabase
      .from("bookings")
      .update({
        travel_date: input.travel_date,
        notes: input.notes,
        updated_by: userId,
      })
      .eq("id", input.booking_id);
  }

  return { booking_id: existing.id, reference_number: existing.reference_number };
}

async function loadBookingTravelers(
  supabase: SupabaseClient,
  bookingId: string
): Promise<{ traveler_id: string; first_name: string; last_name: string; tier: string }[]> {
  const { data } = await supabase
    .from("booking_travelers")
    .select("traveler_id, price_tier, travelers(first_name, last_name)")
    .eq("booking_id", bookingId);

  return (data ?? []).map((row) => {
    const t = unwrapJoin(row.travelers) as {
      first_name: string;
      last_name: string;
    } | null;
    return {
      traveler_id: row.traveler_id,
      first_name: t?.first_name ?? "",
      last_name: t?.last_name ?? "",
      tier: row.price_tier,
    };
  });
}

export async function executeProposeCancellation(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string,
  bookingId: string,
  reason: string
): Promise<{ booking_id: string; reference_number: string; eligible: boolean; message: string }> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference_number, status, payment_status")
    .eq("id", bookingId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!booking) throw new Error("Booking not found.");

  if (booking.status === "cancelled") {
    return {
      booking_id: booking.id,
      reference_number: booking.reference_number,
      eligible: false,
      message: "Booking is already cancelled.",
    };
  }

  if (booking.status === "completed") {
    return {
      booking_id: booking.id,
      reference_number: booking.reference_number,
      eligible: false,
      message: "Completed bookings require manual review for cancellation.",
    };
  }

  const note =
    `[Booking Agent — cancellation request pending staff approval]\n` +
    `Reason: ${reason}\n` +
    `Payment status: ${booking.payment_status}. Staff must confirm cancellation in Bookings UI.`;

  await supabase.from("booking_notes").insert({
    booking_id: bookingId,
    tenant_id: tenantId,
    note,
    created_by: userId,
  });

  return {
    booking_id: booking.id,
    reference_number: booking.reference_number,
    eligible: true,
    message:
      "Cancellation request recorded. A staff member must confirm cancellation — the agent cannot cancel autonomously.",
  };
}

export function getCancellationRules(status: string, paymentStatus: string): string {
  if (status === "draft") {
    return "Draft bookings can be discarded or cancelled without payment impact.";
  }
  if (status === "confirmed" && paymentStatus === "unpaid") {
    return "Confirmed but unpaid — cancellation typically allowed; verify agency policy.";
  }
  if (paymentStatus === "partial" || paymentStatus === "paid") {
    return "Payments recorded — cancellation may require refund processing by Finance.";
  }
  return "Review agency cancellation policy before confirming.";
}
