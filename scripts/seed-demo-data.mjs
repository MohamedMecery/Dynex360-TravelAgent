/**
 * Idempotent demo business data seed for TravelOS MVP.
 *
 * Usage:
 *   npm run db:seed
 *   TENANT_SLUG=my-agency npm run db:seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Run `npm run admin:create` first to provision a tenant.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEED_VERSION,
  SEED_EMAIL_DOMAIN,
  DESTINATIONS,
  PACKAGES,
  CUSTOMERS,
  TRAVELERS,
  BOOKINGS,
  PAYMENTS,
  KNOWLEDGE_DOCUMENTS,
  BOOKING_STATUS_EXPECTED,
  buildLineItems,
  statusHistoryForBooking,
  isoDaysAgo,
  sid,
} from "./seed/demo-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT_SLUG = process.env.TENANT_SLUG ?? "dynex360-travel";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsert(table, rows, onConflict = "id") {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table} upsert: ${error.message}`);
}

async function resolveTenantId() {
  const { data, error } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", TENANT_SLUG)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(
      `Tenant slug "${TENANT_SLUG}" not found. Run: npm run admin:create`
    );
  }
  return data;
}

async function resolveGeo() {
  const { data: countries, error } = await supabase
    .from("countries")
    .select("id, iso2");
  if (error) throw error;
  const countryByIso = new Map(countries.map((c) => [c.iso2, c.id]));

  const { data: cities, error: cityError } = await supabase
    .from("cities")
    .select("id, name, country_id");
  if (cityError) throw cityError;

  function cityId(iso2, name) {
    const countryId = countryByIso.get(iso2);
    if (!countryId) throw new Error(`Country ${iso2} not found — run migrations 010_seed_geography`);
    const city = cities.find((c) => c.country_id === countryId && c.name === name);
    if (!city) throw new Error(`City ${name}, ${iso2} not found in geography seed`);
    return city.id;
  }

  return { countryByIso, cityId };
}

async function seedDestinations(tenantId, geo) {
  const rows = DESTINATIONS.map((d) => ({
    id: d.id,
    tenant_id: tenantId,
    country_id: geo.countryByIso.get(d.countryIso),
    city_id: geo.cityId(d.countryIso, d.cityName),
    name: d.name,
    slug: d.slug,
    description: d.description,
    status: "active",
  }));
  await upsert("destinations", rows);
  return rows.length;
}

async function seedPackages(tenantId) {
  let dayCount = 0;
  let pricingCount = 0;

  const packageRows = PACKAGES.map((p) => ({
    id: p.id,
    tenant_id: tenantId,
    destination_id: DESTINATIONS[p.destinationIdx].id,
    title: p.title,
    description: p.description,
    duration_days: p.durationDays,
    status: p.status,
    deleted_at: null,
  }));
  await upsert("packages", packageRows);

  for (let pi = 0; pi < PACKAGES.length; pi += 1) {
    const pkg = PACKAGES[pi];
    const dayRows = pkg.days.map((day, di) => ({
      id: sid("0003", pi * 100 + day.day),
      package_id: pkg.id,
      tenant_id: tenantId,
      day_number: day.day,
      title: day.title,
      description: day.description,
    }));
    await upsert("package_days", dayRows);
    dayCount += dayRows.length;

    const pricingRows = pkg.pricing.map((pr, ti) => ({
      id: sid("0004", pi * 10 + ti + 1),
      package_id: pkg.id,
      tenant_id: tenantId,
      tier: pr.tier,
      amount: pr.amount,
      currency: pr.currency,
    }));
    await upsert("package_pricing", pricingRows, "package_id,tier");
    pricingCount += pricingRows.length;
  }

  return { packages: packageRows.length, days: dayCount, pricing: pricingCount };
}

async function seedCustomers(tenantId) {
  const rows = CUSTOMERS.map((c) => ({
    id: c.id,
    tenant_id: tenantId,
    type: c.type,
    first_name: c.firstName ?? null,
    last_name: c.lastName ?? null,
    company_name: c.companyName ?? null,
    email: c.email,
    phone: c.phone,
    notes: `[${SEED_VERSION}] Demo customer for MVP testing.`,
    deleted_at: null,
  }));
  await upsert("customers", rows);
  return rows.length;
}

async function seedTravelers(tenantId, geo) {
  const rows = TRAVELERS.map((t) => ({
    id: t.id,
    tenant_id: tenantId,
    customer_id: t.customerId,
    first_name: t.firstName,
    last_name: t.lastName,
    date_of_birth: t.dateOfBirth,
    gender: t.gender,
    nationality_country_id: geo.countryByIso.get(t.nationalityIso) ?? null,
    email: t.email ?? null,
    deleted_at: null,
  }));
  await upsert("travelers", rows);
  return rows.length;
}

async function seedBookings(tenantId) {
  const bookingTotals = new Map();
  let itemCount = 0;
  let travelerLinkCount = 0;
  let historyCount = 0;

  for (let bi = 0; bi < BOOKINGS.length; bi += 1) {
    const b = BOOKINGS[bi];
    const customer = CUSTOMERS[b.customerIdx];
    const pkg = PACKAGES[b.packageIdx];
    const createdAt = isoDaysAgo(b.createdDaysAgo);
    const lineItems = buildLineItems(pkg, b.slots);
    const total = lineItems.reduce((sum, li) => sum + li.total_price, 0);
    const currency = lineItems[0]?.currency ?? "USD";

    bookingTotals.set(bi, total);

    const initialPaymentStatus =
      b.status === "draft" || b.status === "cancelled" ? "unpaid" : "unpaid";

    await upsert("bookings", [
      {
        id: b.id,
        tenant_id: tenantId,
        reference_number: b.ref,
        customer_id: customer.id,
        package_id: pkg.id,
        status: b.status,
        payment_status: initialPaymentStatus,
        total_amount: total,
        currency,
        travel_date: b.travelDate,
        notes: `[${SEED_VERSION}] Demo booking.`,
        deleted_at: null,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ]);

    const itemRows = lineItems.map((li, ii) => ({
      id: sid("0008", bi * 10 + ii + 1),
      booking_id: b.id,
      tenant_id: tenantId,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
      total_price: li.total_price,
    }));
    await upsert("booking_items", itemRows);
    itemCount += itemRows.length;

    const btRows = b.slots.map((slot, si) => ({
      id: sid("000b", bi * 10 + si + 1),
      booking_id: b.id,
      traveler_id: TRAVELERS[slot.t].id,
      tenant_id: tenantId,
      is_lead: slot.lead,
      price_tier: slot.tier,
    }));
    await upsert("booking_travelers", btRows, "booking_id,traveler_id");
    travelerLinkCount += btRows.length;

    const historyRows = statusHistoryForBooking(bi, b.id, tenantId, b.status, createdAt);
    if (historyRows.length) {
      await upsert("booking_status_history", historyRows);
      historyCount += historyRows.length;
    }
  }

  return {
    bookings: BOOKINGS.length,
    items: itemCount,
    bookingTravelers: travelerLinkCount,
    history: historyCount,
    bookingTotals,
  };
}

async function seedPayments(tenantId, bookingTotals) {
  const rows = [];
  for (const p of PAYMENTS) {
    const booking = BOOKINGS[p.bookingIdx];
    // The 018 booking guard rejects payments on cancelled bookings
    if (booking.status === "cancelled") continue;
    const total = bookingTotals.get(p.bookingIdx) ?? 0;
    const amount = Math.round(total * p.fraction * 100) / 100;
    if (amount <= 0) continue;

    rows.push({
      id: p.id,
      tenant_id: tenantId,
      booking_id: booking.id,
      amount,
      method: p.method,
      reference_number: p.ref,
      payment_date: isoDaysAgo(p.daysAgo).slice(0, 10),
      notes: `[${SEED_VERSION}] Demo payment.`,
      deleted_at: null,
    });
  }
  await upsert("payments", rows);
  return rows.length;
}

async function seedKnowledge(tenantId) {
  let docCount = 0;
  let chunkCount = 0;

  for (let di = 0; di < KNOWLEDGE_DOCUMENTS.length; di += 1) {
    const doc = KNOWLEDGE_DOCUMENTS[di];
    await upsert("knowledge_documents", [
      {
        id: doc.id,
        tenant_id: tenantId,
        title: doc.title,
        document_type: doc.documentType,
        status: "published",
        storage_path: null,
        metadata: { seed: SEED_VERSION },
        deleted_at: null,
      },
    ]);
    docCount += 1;

    const chunkRows = doc.chunks.map((content, ci) => ({
      id: sid("000d", di * 10 + ci + 1),
      document_id: doc.id,
      tenant_id: tenantId,
      chunk_index: ci,
      content,
      embedding: null,
      token_count: content.split(/\s+/).length,
      metadata: { seed: SEED_VERSION },
    }));
    await upsert("knowledge_chunks", chunkRows, "document_id,chunk_index");
    chunkCount += chunkRows.length;
  }

  return { documents: docCount, chunks: chunkCount };
}

async function verifyDashboardAndAgents(tenantId) {
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select("status, payment_status, total_amount, reference_number")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if (bErr) throw bErr;

  const demoBookings = (bookings ?? []).filter((b) =>
    String(b.reference_number).startsWith("DEMO-BK-")
  );

  const statusCounts = { draft: 0, confirmed: 0, completed: 0, cancelled: 0 };
  for (const b of demoBookings) {
    if (b.status in statusCounts) statusCounts[b.status] += 1;
  }

  const { data: payments, error: pErr } = await supabase
    .from("payments")
    .select("amount")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  if (pErr) throw pErr;

  const totalRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const totalBooked = (bookings ?? [])
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + Number(b.total_amount), 0);
  const outstanding = Math.max(0, totalBooked - totalRevenue);

  const paymentMix = { unpaid: 0, partial: 0, paid: 0 };
  for (const b of bookings ?? []) {
    if (b.payment_status in paymentMix) paymentMix[b.payment_status] += 1;
  }

  const { count: publishedPackages, error: pkgErr } = await supabase
    .from("packages")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .is("deleted_at", null);
  if (pkgErr) throw pkgErr;

  const { data: dubaiSearch, error: searchErr } = await supabase
    .from("packages")
    .select("id, title, status")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .is("deleted_at", null)
    .ilike("title", "%Dubai%");
  if (searchErr) throw searchErr;

  const { count: knowledgeDocs, error: kErr } = await supabase
    .from("knowledge_documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .is("deleted_at", null);
  if (kErr) throw kErr;

  const { count: knowledgeChunks, error: kcErr } = await supabase
    .from("knowledge_chunks")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (kcErr) throw kcErr;

  const statusOk = Object.entries(BOOKING_STATUS_EXPECTED).every(
    ([status, expected]) => statusCounts[status] === expected
  );

  return {
    statusCounts,
    statusOk,
    totalRevenue,
    outstanding,
    paymentMix,
    publishedPackages: publishedPackages ?? 0,
    dubaiPackageCount: dubaiSearch?.length ?? 0,
    knowledgeDocs: knowledgeDocs ?? 0,
    knowledgeChunks: knowledgeChunks ?? 0,
  };
}

async function verifyCounts(tenantId) {
  const tables = [
    ["destinations", "id"],
    ["packages", "id"],
    ["customers", "id"],
    ["travelers", "id"],
    ["bookings", "id"],
    ["payments", "id"],
  ];

  const counts = {};
  for (const [table] of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (error) throw error;
    counts[table] = count ?? 0;
  }

  const demoCustomers = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .ilike("email", `%@${SEED_EMAIL_DOMAIN}`);
  counts.demo_customers = demoCustomers.count ?? 0;

  return counts;
}

async function main() {
  const validateOnly = process.argv.includes("--validate-only");

  console.log(`TravelOS demo seed (${SEED_VERSION})`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Tenant slug: ${TENANT_SLUG}\n`);

  const tenant = await resolveTenantId();
  console.log(`Tenant: ${tenant.name} (${tenant.id})\n`);

  if (validateOnly) {
    const validation = await verifyDashboardAndAgents(tenant.id);
    const counts = await verifyCounts(tenant.id);
    console.log("--- Validate-only mode ---");
    console.log(JSON.stringify({ validation, counts }, null, 2));
    process.exit(validation.statusOk && validation.publishedPackages >= 5 ? 0 : 1);
  }

  const geo = await resolveGeo();

  const destCount = await seedDestinations(tenant.id, geo);
  console.log(`✓ ${destCount} destinations`);

  const pkgStats = await seedPackages(tenant.id);
  console.log(
    `✓ ${pkgStats.packages} published packages (${pkgStats.days} itinerary days, ${pkgStats.pricing} price tiers)`
  );

  const custCount = await seedCustomers(tenant.id);
  console.log(`✓ ${custCount} customers`);

  const travCount = await seedTravelers(tenant.id, geo);
  console.log(`✓ ${travCount} travelers`);

  const bookingStats = await seedBookings(tenant.id);
  console.log(
    `✓ ${bookingStats.bookings} bookings (${bookingStats.items} line items, ${bookingStats.bookingTravelers} booking-traveler links, ${bookingStats.history} status history entries)`
  );

  const payCount = await seedPayments(tenant.id, bookingStats.bookingTotals);
  console.log(`✓ ${payCount} payments (payment_status recalculated by DB triggers)`);

  const knowledgeStats = await seedKnowledge(tenant.id);
  console.log(`✓ ${knowledgeStats.documents} knowledge documents (${knowledgeStats.chunks} FTS chunks)`);

  const validation = await verifyDashboardAndAgents(tenant.id);
  console.log("\n--- Post-seed validation ---");
  console.log(
    `Booking statuses: draft=${validation.statusCounts.draft} confirmed=${validation.statusCounts.confirmed} completed=${validation.statusCounts.completed} cancelled=${validation.statusCounts.cancelled} ${validation.statusOk ? "✓" : "✗"}`
  );
  console.log(`Payment mix: unpaid=${validation.paymentMix.unpaid} partial=${validation.paymentMix.partial} paid=${validation.paymentMix.paid}`);
  console.log(`Dashboard revenue: $${validation.totalRevenue.toFixed(2)} | outstanding: $${validation.outstanding.toFixed(2)}`);
  console.log(`Published packages: ${validation.publishedPackages} (Dubai search: ${validation.dubaiPackageCount})`);
  console.log(`Knowledge base: ${validation.knowledgeDocs} docs, ${validation.knowledgeChunks} chunks`);

  if (!validation.statusOk) {
    console.warn("Warning: booking status counts below expected demo mix.");
  }

  const counts = await verifyCounts(tenant.id);
  console.log("\n--- Tenant totals ---");
  console.log(`Destinations: ${counts.destinations}`);
  console.log(`Packages:     ${counts.packages}`);
  console.log(`Customers:    ${counts.customers} (${counts.demo_customers} demo emails)`);
  console.log(`Travelers:    ${counts.travelers}`);
  console.log(`Bookings:     ${counts.bookings}`);
  console.log(`Payments:     ${counts.payments}`);

  console.log("\nSeed complete. Sign in and open /dashboard, /customers, /bookings.");
  console.log(`Demo customer emails use @${SEED_EMAIL_DOMAIN}`);
  console.log("Demo script: docs/05-Development/DemoScript.md");
  console.log("Re-run safely: npm run db:seed");
}

main().catch((err) => {
  console.error(err.message ?? err);
  if (String(err.message).includes("fetch failed") || String(err.message).includes("ECONNREFUSED")) {
    console.error("\nSupabase unreachable. Check .env.local or run: npx supabase start");
  }
  process.exit(1);
});
