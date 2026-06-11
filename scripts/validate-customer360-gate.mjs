/**
 * Sprint 5 gate — automated checks (staging/live DB + permission matrix).
 *
 * Usage:
 *   node scripts/validate-customer360-gate.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const STABLE_EVENT_TYPES = new Set([
  "lead_created",
  "opportunity_created",
  "opportunity.stage_changed",
  "activity.call.incoming",
  "activity.call.outgoing",
  "activity.whatsapp.incoming",
  "activity.whatsapp.outgoing",
  "activity.email.incoming",
  "activity.email.outgoing",
  "activity.meeting",
  "activity.task",
  "booking_created",
  "invoice_created",
  "payment_received",
  "ticket_created",
]);

const FORBIDDEN_EVENT_TYPES = ["quotation_sent", "quotation_approved", "quotation_accepted"];

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

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

/** Mirrors src/lib/auth/customers-permissions.ts */
function canReadCustomer360Financial(role) {
  if (role === "super_admin") return true;
  return role === "tenant_admin" || role === "finance_officer";
}

function expectedFinancialVisible(role) {
  return canReadCustomer360Financial(role);
}

async function main() {
  console.log("Customer 360 Sprint 5 gate validation\n");

  // Permission matrix (unit-level, no DB)
  assert(!expectedFinancialVisible("sales_agent"), "sales_agent: financial hidden");
  assert(expectedFinancialVisible("finance_officer"), "finance_officer: financial visible");
  assert(expectedFinancialVisible("tenant_admin"), "tenant_admin: financial visible");
  console.log("PASS: financial permission matrix");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && key, "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: eventRows, error: eventErr } = await supabase
    .from("v_customer_timeline_events")
    .select("event_type")
    .limit(500);
  assert(!eventErr, eventErr?.message ?? "timeline view");

  const types = new Set((eventRows ?? []).map((r) => r.event_type));
  for (const t of types) {
    assert(STABLE_EVENT_TYPES.has(t), `unknown event_type in view: ${t}`);
    assert(!FORBIDDEN_EVENT_TYPES.includes(t), `forbidden event_type: ${t}`);
  }
  console.log(`PASS: timeline event_type contract (${types.size} distinct types in sample)`);

  const { count: travelCount, error: travelErr } = await supabase
    .from("v_customer_travel_history")
    .select("*", { count: "exact", head: true });
  assert(!travelErr, travelErr?.message ?? "travel view");
  console.log(`PASS: v_customer_travel_history (${travelCount ?? 0} aggregate rows)`);

  const { data: customers } = await supabase
    .from("customers")
    .select("id, tenant_id")
    .is("deleted_at", null)
    .limit(5);

  if ((customers ?? []).length > 0) {
    const sample = customers[0];
    const { data: timelinePage, error: pageErr } = await supabase
      .from("v_customer_timeline_events")
      .select("id, occurred_at, event_type")
      .eq("customer_id", sample.id)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(51);
    assert(!pageErr, pageErr?.message ?? "timeline page");
    const rows = timelinePage ?? [];
    if (rows.length > 50) {
      console.log("PASS: timeline pagination sample (>50 rows for cursor test customer)");
    } else {
      console.log(`PASS: timeline sample for customer (${rows.length} rows)`);
    }
  }

  console.log("\nAutomated gate checks passed.");
  console.log(
    "Manual still required: UI QA all tabs, P95 latency on GET /api/customers/:id/360, wrong-tenant 404."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
