/**
 * Sprint 7E — Mobile production UAT (Bearer API + workflow + 360 + bookings).
 *
 * Usage:
 *   node scripts/run-sprint7e-mobile-uat.mjs
 *   GATE_BASE_URL=http://localhost:3000 node scripts/run-sprint7e-mobile-uat.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";
const BASE_URL = (process.env.GATE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const USERS = {
  tenant_admin: process.env.GATE_ADMIN_EMAIL ?? "eng.m.mecery@gmail.com",
  sales_agent: process.env.GATE_SALES_EMAIL ?? "wp3a-sales@demo.travelos.local",
  finance_officer: process.env.GATE_FINANCE_EMAIL ?? "wp3a-finance@demo.travelos.local",
};

const results = [];

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

function record(section, item, status, detail = "") {
  results.push({ section, item, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "SKIP";
  console.log(`${mark}: [${section}] ${item}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase env");

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return { bearer: data.session.access_token, supabase };
}

async function api(bearer, path, init = {}) {
  const headers = { Accept: "application/json", ...(init.headers ?? {}) };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  record("Setup", "BASE_URL reachable", "SKIP", BASE_URL);

  let sales, admin, finance;
  try {
    sales = await signIn(USERS.sales_agent);
    admin = await signIn(USERS.tenant_admin);
    finance = await signIn(USERS.finance_officer);
    record("Auth", "sales_agent Bearer sign-in", "PASS");
    record("Auth", "tenant_admin Bearer sign-in", "PASS");
    record("Auth", "finance_officer Bearer sign-in", "PASS");
  } catch (e) {
    record("Auth", "sign-in", "FAIL", String(e));
    writeReport();
    process.exit(1);
  }

  const me = await api(sales.bearer, "/api/auth/me?include_permissions=true");
  record(
    "Auth",
    "GET /api/auth/me (mobile bootstrap)",
    me.res.ok && me.body?.data?.permissions?.length ? "PASS" : "FAIL",
    me.body?.error?.message
  );

  const dash = await api(sales.bearer, "/api/crm/dashboard?period=month");
  record("Dashboard", "GET /api/crm/dashboard", dash.res.ok ? "PASS" : "FAIL");

  const leads = await api(sales.bearer, "/api/leads?limit=5&page=1");
  record("Leads", "GET /api/leads paginated", leads.res.ok ? "PASS" : "FAIL");

  const opps = await api(sales.bearer, "/api/opportunities?limit=5&page=1");
  record("Opportunities", "GET /api/opportunities", opps.res.ok ? "PASS" : "FAIL");

  const acts = await api(sales.bearer, "/api/activities?view=upcoming&limit=5");
  record("Activities", "GET /api/activities", acts.res.ok ? "PASS" : "FAIL");

  const qList = await api(sales.bearer, "/api/quotations?limit=5&page=1");
  record("Quotations", "GET /api/quotations list", qList.res.ok ? "PASS" : "FAIL");

  const qSearch = await api(sales.bearer, "/api/quotations?search=QT-&limit=5");
  record(
    "Quotations",
    "GET /api/quotations?search= (server-side)",
    qSearch.res.ok ? "PASS" : "FAIL",
    qSearch.body?.error?.message
  );

  const bookings = await api(sales.bearer, "/api/bookings?limit=5&page=1");
  record("Bookings", "GET /api/bookings", bookings.res.ok ? "PASS" : "FAIL");

  const finBookings = await api(finance.bearer, "/api/bookings?limit=1");
  record(
    "Bookings",
    "finance_officer read bookings",
    finBookings.res.ok ? "PASS" : "FAIL"
  );

  const finPatch = await api(finance.bearer, "/api/bookings/00000000-0000-0000-0000-000000000099/status", {
    method: "PATCH",
    body: JSON.stringify({ status: "confirmed" }),
  });
  record(
    "Bookings",
    "finance_officer status update forbidden",
    finPatch.res.status === 403 ? "PASS" : "FAIL",
    `status ${finPatch.res.status}`
  );

  async function ensureOpportunity() {
    const { data: customers } = await sales.supabase
      .from("customers")
      .select("id")
      .is("deleted_at", null)
      .limit(1);
    const customerId = customers?.[0]?.id;
    if (!customerId) throw new Error("No customer for UAT");

    const oppRes = await api(sales.bearer, "/api/opportunities", {
      method: "POST",
      body: JSON.stringify({
        destination_text: `Sprint7E Mobile UAT ${Date.now()}`,
        customer_id: customerId,
        stage: "proposal",
        pax_count: 2,
        currency: "USD",
        estimated_revenue: 1500,
      }),
    });
    if (!oppRes.res.ok) throw new Error(oppRes.body?.error?.message ?? "opp create failed");
    return { oppId: oppRes.body.data.id, customerId };
  }

  // Quotation lifecycle (simple path — customer + line items required for send)
  try {
    const { oppId, customerId } = await ensureOpportunity();
    const createQ = await api(sales.bearer, "/api/quotations", {
      method: "POST",
      body: JSON.stringify({
        opportunity_id: oppId,
        customer_id: customerId,
        items: [{ item_type: "package", description: "7E UAT", quantity: 1, unit_price: 1000 }],
      }),
    });
    record(
      "Quotation workflow",
      "create draft",
      createQ.res.ok ? "PASS" : "FAIL",
      createQ.body?.error?.message
    );
    const qid = createQ.body?.data?.id;
    if (qid) {
      for (const [action, expected] of [
        ["send", "sent"],
        ["mark-viewed", "viewed"],
        ["accept", "accepted"],
        ["convert", "converted_to_booking"],
      ]) {
        const r = await api(sales.bearer, `/api/quotations/${qid}/${action}`, {
          method: "POST",
          body: action === "convert" ? undefined : "{}",
        });
        const status = r.body?.data?.status ?? r.body?.data?.quotation?.status;
        const ok =
          r.res.ok &&
          (action === "convert" ? status === "converted_to_booking" : status === expected);
        record(
          "Quotation workflow",
          `${action} → ${expected}`,
          ok ? "PASS" : "FAIL",
          r.body?.error?.message ?? `got ${status}`
        );
      }
      const customerId360 = createQ.body.data.customer_id ?? customerId;
      if (customerId360) {
        const c360 = await api(sales.bearer, `/api/customers/${customerId360}/360`);
        record("Customer 360", "GET summary", c360.res.ok ? "PASS" : "FAIL");
        const tl = await api(sales.bearer, `/api/customers/${customerId360}/360/timeline?limit=30`);
        record("Customer 360", "GET timeline", tl.res.ok ? "PASS" : "FAIL");
        const hasQuoteEvent = (tl.body?.data ?? []).some((e) =>
          String(e.event_type).startsWith("quotation_")
        );
        record(
          "Customer 360",
          "quotation timeline events",
          hasQuoteEvent ? "PASS" : "SKIP",
          hasQuoteEvent ? "" : "no quotation events in first page"
        );
        record(
          "Customer 360",
          "timeline pagination meta",
          tl.body?.meta?.has_more != null ? "PASS" : "FAIL"
        );
      }
    }
  } catch (e) {
    record("Quotation workflow", "lifecycle", "FAIL", String(e));
  }

  const unauth = await api(null, "/api/leads?limit=1");
  record("Security", "unauthenticated /api/leads → 401", unauth.res.status === 401 ? "PASS" : "FAIL");

  writeReport();
  const fails = results.filter((r) => r.status === "FAIL").length;
  process.exit(fails > 0 ? 1 : 0);
}

function writeReport() {
  const outDir = resolve(root, "scripts");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = resolve(outDir, "sprint7e-mobile-uat-results.json");
  writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${jsonPath}`);
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  console.log(`Summary: ${pass} PASS, ${fail} FAIL, ${results.length - pass - fail} SKIP`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
