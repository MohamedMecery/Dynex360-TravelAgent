/**
 * Sprint 5 gate — seed worst-case Customer 360 profile on staging/live DB.
 *
 * Creates customer 00000000-gate-4000-8000-000000000001 with:
 * 100 activities, 50 bookings, 50 payments, 20 invoices, 20 support tickets
 *
 * Usage: node scripts/sprint5-gate-seed-heavy-customer.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const GATE_CUSTOMER_ID = "00000000-00ea-4000-8000-000000000001";

function gateId(seq) {
  return `00000000-00ea-4000-8000-${String(seq).padStart(12, "0")}`;
}
const TENANT_SLUG = process.env.TENANT_SLUG ?? "dynex360-travel";
const SEED_MARKER = "[sprint5-gate-heavy-v1]";

function loadEnvFile(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", TENANT_SLUG)
    .single();
  if (tenantErr || !tenant) {
    console.error("Tenant not found:", TENANT_SLUG, tenantErr?.message);
    process.exit(1);
  }
  const tenantId = tenant.id;

  const { data: pkg } = await supabase
    .from("packages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(1)
    .single();
  if (!pkg) {
    console.error("No published package for tenant");
    process.exit(1);
  }

  const { data: assignee } = await supabase
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", "wp3a-sales@demo.travelos.local")
    .limit(1)
    .maybeSingle();
  const assignedTo =
    assignee?.id ??
    (
      await supabase
        .from("users")
        .select("id")
        .eq("tenant_id", tenantId)
        .limit(1)
        .single()
    ).data?.id;
  if (!assignedTo) {
    console.error("No user for assigned_to");
    process.exit(1);
  }

  const { error: custErr } = await supabase.from("customers").upsert({
    id: GATE_CUSTOMER_ID,
    tenant_id: tenantId,
    type: "corporate",
    company_name: "Gate Heavy Customer Corp",
    email: "gate-heavy@demo.travelos.local",
    phone: "+1-555-9999",
    notes: SEED_MARKER,
  });
  if (custErr) {
    console.error("customer upsert:", custErr.message);
    process.exit(1);
  }

  // Clean prior gate rows (idempotent re-run)
  const tables = [
    ["activities", "related_customer_id"],
    ["support_tickets", "customer_id"],
    ["payments", "booking_id"],
    ["invoices", "booking_id"],
    ["bookings", "customer_id"],
  ];
  const { data: oldBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_id", GATE_CUSTOMER_ID);
  const bookingIds = (oldBookings ?? []).map((b) => b.id);
  if (bookingIds.length > 0) {
    await supabase.from("payments").delete().in("booking_id", bookingIds);
    await supabase.from("invoices").delete().in("booking_id", bookingIds);
  }
  await supabase.from("activities").delete().eq("related_customer_id", GATE_CUSTOMER_ID);
  await supabase.from("support_tickets").delete().eq("customer_id", GATE_CUSTOMER_ID);
  await supabase.from("bookings").delete().eq("customer_id", GATE_CUSTOMER_ID);

  const now = Date.now();
  const bookingRows = Array.from({ length: 50 }, (_, i) => ({
    id: gateId(1000 + i),
    tenant_id: tenantId,
    customer_id: GATE_CUSTOMER_ID,
    package_id: pkg.id,
    reference_number: `GATE-BK-${String(i + 1).padStart(4, "0")}`,
    status: i % 5 === 0 ? "draft" : "confirmed",
    payment_status: "partial",
    total_amount: 1000 + i * 10,
    currency: "USD",
    travel_date: "2026-12-01",
    notes: SEED_MARKER,
    created_at: new Date(now - i * 86_400_000).toISOString(),
  }));

  for (const batch of chunk(bookingRows, 25)) {
    const { error } = await supabase.from("bookings").insert(batch);
    if (error) {
      console.error("bookings insert:", error.message);
      process.exit(1);
    }
  }

  const invoiceRows = Array.from({ length: 20 }, (_, i) => ({
    id: gateId(2000 + i),
    tenant_id: tenantId,
    booking_id: bookingRows[i].id,
    invoice_number: `GATE-INV-${String(i + 1).padStart(4, "0")}`,
    status: "issued",
    issue_date: "2026-01-15",
    due_date: "2026-02-15",
    subtotal: 900,
    tax_amount: 100,
    total_amount: 1000,
    currency: "USD",
    notes: SEED_MARKER,
    created_at: new Date(now - i * 43_200_000).toISOString(),
  }));
  for (const batch of chunk(invoiceRows, 20)) {
    const { error } = await supabase.from("invoices").insert(batch);
    if (error) {
      console.error("invoices insert:", error.message);
      process.exit(1);
    }
  }

  const paymentRows = Array.from({ length: 50 }, (_, i) => ({
    id: gateId(3000 + i),
    tenant_id: tenantId,
    booking_id: bookingRows[i].id,
    invoice_id: i < 20 ? invoiceRows[i].id : null,
    amount: 100 + i,
    method: "bank_transfer",
    reference_number: `GATE-PAY-${String(i + 1).padStart(4, "0")}`,
    payment_date: "2026-02-01",
    notes: SEED_MARKER,
    created_at: new Date(now - i * 21_600_000).toISOString(),
  }));
  for (const batch of chunk(paymentRows, 25)) {
    const { error } = await supabase.from("payments").insert(batch);
    if (error) {
      console.error("payments insert:", error.message);
      process.exit(1);
    }
  }

  const ticketRows = Array.from({ length: 20 }, (_, i) => ({
    id: gateId(4000 + i),
    tenant_id: tenantId,
    customer_id: GATE_CUSTOMER_ID,
    ticket_number: `GATE-TKT-${String(i + 1).padStart(4, "0")}`,
    subject: `Gate support ticket ${i + 1}`,
    status: "open",
    priority: "medium",
    created_at: new Date(now - i * 10_800_000).toISOString(),
  }));
  const { error: ticketErr } = await supabase.from("support_tickets").insert(ticketRows);
  if (ticketErr) {
    console.error("tickets insert:", ticketErr.message);
    process.exit(1);
  }

  const activityTypes = ["call", "whatsapp", "email", "meeting", "task"];
  const activityRows = Array.from({ length: 100 }, (_, i) => {
    const type = activityTypes[i % activityTypes.length];
    const needsDir = type === "call" || type === "whatsapp" || type === "email";
    return {
      id: gateId(5000 + i),
      tenant_id: tenantId,
      activity_type: type,
      direction: needsDir ? (i % 2 === 0 ? "incoming" : "outgoing") : null,
      subject: `Gate activity ${i + 1}`,
      assigned_to: assignedTo,
      related_customer_id: GATE_CUSTOMER_ID,
      status: "completed",
      completed_at: new Date(now - i * 3_600_000).toISOString(),
      created_at: new Date(now - i * 3_600_000).toISOString(),
    };
  });
  for (const batch of chunk(activityRows, 50)) {
    const { error } = await supabase.from("activities").insert(batch);
    if (error) {
      console.error("activities insert:", error.message);
      process.exit(1);
    }
  }

  const { count: timelineCount } = await supabase
    .from("v_customer_timeline_events")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", GATE_CUSTOMER_ID);

  console.log("PASS: Gate heavy customer seeded");
  console.log(`  customer_id: ${GATE_CUSTOMER_ID}`);
  console.log(`  tenant: ${TENANT_SLUG} (${tenantId})`);
  console.log(`  timeline_events (view): ${timelineCount ?? "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
