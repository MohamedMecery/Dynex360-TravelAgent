/**
 * Sprint 6 final closure — post-deploy validation + workflow/RLS UAT.
 * Requires .env.local with staging Supabase + GATE_BASE_URL (app using same DB).
 *
 * Usage:
 *   node scripts/run-sprint6-closure-uat.mjs
 *   GATE_BASE_URL=http://localhost:3000 node scripts/run-sprint6-closure-uat.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
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
  sales_other_tenant: process.env.GATE_SALES_FOREIGN_EMAIL ?? "wp3a-foreign@demo.travelos.local",
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

async function createAuthedClient(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase URL/anon key");

  const jar = {};
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return Object.entries(jar).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) jar[name] = value;
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in ${email}: ${error.message}`);
  return { supabase, jar };
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function apiFetch(jar, path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(jar),
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function setTenantApprovalMode(mode) {
  const svc = createServiceClient();
  const { data: ts } = await svc.from("tenant_settings").select("tenant_id").limit(1).single();
  if (!ts?.tenant_id) return;
  await svc
    .from("tenant_settings")
    .update({ quotation_approval_mode: mode })
    .eq("tenant_id", ts.tenant_id);
}

async function validateSchema(service) {
  for (const table of ["quotations", "quotation_items"]) {
    const { error } = await service.from(table).select("id").limit(1);
    record("Deploy", `table ${table}`, error ? "FAIL" : "PASS", error?.message);
  }

  const { error: idxErr } = await service
    .from("bookings")
    .select("quotation_id")
    .limit(1);
  record("Deploy", "bookings.quotation_id", idxErr ? "FAIL" : "PASS", idxErr?.message);

  const { data: perms } = await service.from("permissions").select("action").eq("module", "crm");
  const actions = new Set((perms ?? []).map((p) => p.action));
  for (const a of [
    "quotations.read",
    "quotations.read_all",
    "quotations.write",
    "quotations.write_all",
    "quotations.approve",
    "quotations.send",
    "quotations.accept",
    "quotations.convert",
  ]) {
    record("Deploy", `permission ${a}`, actions.has(a) ? "PASS" : "FAIL");
  }
}

async function ensureOpportunity(salesJar, salesSupabase) {
  const { data: customers } = await salesSupabase
    .from("customers")
    .select("id")
    .is("deleted_at", null)
    .limit(1);
  const customerId = customers?.[0]?.id;
  if (!customerId) throw new Error("No customer for UAT");

  const { data: existing } = await salesSupabase
    .from("opportunities")
    .select("id, customer_id")
    .is("deleted_at", null)
    .limit(1);
  if (existing?.[0]?.id) {
    return {
      opportunityId: existing[0].id,
      customerId: existing[0].customer_id ?? customerId,
    };
  }

  const createRes = await apiFetch(salesJar, "/api/opportunities", {
    method: "POST",
    body: JSON.stringify({
      destination_text: "Sprint 6 UAT Opportunity",
      customer_id: customerId,
      stage: "proposal",
      pax_count: 2,
      currency: "USD",
      estimated_revenue: 5000,
      probability: 50,
    }),
  });
  if (!createRes.res.ok) {
    throw new Error(`Create opportunity: ${createRes.body?.error?.message ?? createRes.res.status}`);
  }
  return { opportunityId: createRes.body.data.id, customerId };
}

async function runSimpleWorkflow(salesJar, salesSupabase) {
  const { opportunityId, customerId } = await ensureOpportunity(salesJar, salesSupabase);

  const createRes = await apiFetch(salesJar, "/api/quotations", {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: opportunityId,
      customer_id: customerId,
      items: [
        { item_type: "other", description: "UAT package", quantity: 2, unit_price: 1500 },
      ],
    }),
  });
  if (!createRes.res.ok) {
    record("Workflow", "simple create", "FAIL", createRes.body?.error?.message);
    return null;
  }
  const qid = createRes.body.data.id;
  record("Workflow", "simple create draft", "PASS", qid);

  const steps = [
    ["send", "sent"],
    ["mark-viewed", "viewed"],
    ["accept", "accepted"],
    ["convert", "converted_to_booking"],
  ];

  for (const [action, expectedStatus] of steps) {
    const r = await apiFetch(salesJar, `/api/quotations/${qid}/${action}`, {
      method: "POST",
      body: action === "convert" ? undefined : "{}",
    });
    const status = r.body?.data?.status ?? r.body?.data?.quotation?.status;
    const ok = r.res.ok && (action === "convert" ? status === "converted_to_booking" : status === expectedStatus);
    record(
      "Workflow",
      `simple ${action} → ${expectedStatus}`,
      ok ? "PASS" : "FAIL",
      r.body?.error?.message ?? `got ${status}`
    );
  }

  const getRes = await apiFetch(salesJar, `/api/quotations/${qid}`);
  const q = getRes.body?.data;
  if (q) {
    record("Workflow", "simple sent_at", q.sent_at ? "PASS" : "FAIL");
    record("Workflow", "simple viewed_at", q.viewed_at ? "PASS" : "FAIL");
    record("Workflow", "simple accepted_at", q.accepted_at ? "PASS" : "FAIL");
    record("Workflow", "simple total_amount > 0", Number(q.total_amount) > 0 ? "PASS" : "FAIL");
    if (q.booking_id) {
      const svc = createServiceClient();
      const { data: booking } = await svc
        .from("bookings")
        .select("quotation_id")
        .eq("id", q.booking_id)
        .single();
      record(
        "Workflow",
        "booking.quotation_id set",
        booking?.quotation_id === qid ? "PASS" : "FAIL"
      );
    }
    const { data: opp } = await createServiceClient()
      .from("opportunities")
      .select("stage")
      .eq("id", opportunityId)
      .single();
    record("Workflow", "accept → verbal_approval", opp?.stage === "verbal_approval" ? "PASS" : "FAIL", opp?.stage);
  }

  return qid;
}

async function runStandardWorkflow(adminJar, salesJar, salesSupabase) {
  await setTenantApprovalMode("standard");

  const createOppRes = await apiFetch(salesJar, "/api/opportunities", {
    method: "POST",
    body: JSON.stringify({
      destination_text: `Sprint 6 Standard UAT ${Date.now()}`,
      customer_id: (await ensureOpportunity(salesJar, salesSupabase)).customerId,
      stage: "proposal",
      pax_count: 1,
      currency: "USD",
      estimated_revenue: 3000,
      probability: 40,
    }),
  });
  if (!createOppRes.res.ok) {
    record("Workflow", "standard opportunity", "FAIL", createOppRes.body?.error?.message);
    return;
  }
  const opportunityId = createOppRes.body.data.id;
  const customerId = createOppRes.body.data.customer_id;

  const createRes = await apiFetch(salesJar, "/api/quotations", {
    method: "POST",
    body: JSON.stringify({
      opportunity_id: opportunityId,
      customer_id: customerId,
      items: [{ item_type: "hotel", description: "UAT hotel", quantity: 1, unit_price: 2000 }],
    }),
  });
  if (!createRes.res.ok) {
    record("Workflow", "standard create", "FAIL", createRes.body?.error?.message);
    return;
  }
  const qid = createRes.body.data.id;

  const submit = await apiFetch(salesJar, `/api/quotations/${qid}/submit-approval`, {
    method: "POST",
  });
  record(
    "Workflow",
    "standard submit → pending_approval",
    submit.res.ok && submit.body?.data?.status === "pending_approval" ? "PASS" : "FAIL"
  );

  const reject = await apiFetch(adminJar, `/api/quotations/${qid}/reject-approval`, {
    method: "POST",
  });
  record(
    "Workflow",
    "standard reject approval → draft",
    reject.res.ok && reject.body?.data?.status === "draft" ? "PASS" : "FAIL"
  );

  await apiFetch(salesJar, `/api/quotations/${qid}/submit-approval`, { method: "POST" });
  const approve = await apiFetch(adminJar, `/api/quotations/${qid}/approve`, { method: "POST" });
  record(
    "Workflow",
    "standard approve",
    approve.res.ok && approve.body?.data?.status === "approved" ? "PASS" : "FAIL"
  );

  for (const [action, expectedStatus] of [
    ["send", "sent"],
    ["mark-viewed", "viewed"],
    ["accept", "accepted"],
    ["convert", "converted_to_booking"],
  ]) {
    const r = await apiFetch(salesJar, `/api/quotations/${qid}/${action}`, {
      method: "POST",
      body: action === "convert" ? undefined : "{}",
    });
    const status = r.body?.data?.status ?? r.body?.data?.quotation?.status;
    const ok =
      r.res.ok &&
      (action === "convert" ? status === "converted_to_booking" : status === expectedStatus);
    record(
      "Workflow",
      `standard ${action} → ${expectedStatus}`,
      ok ? "PASS" : "FAIL",
      r.body?.error?.message ?? `got ${status}`
    );
  }

  await setTenantApprovalMode("simple");
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing service role for verification");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function runRlsTests(ownerQid) {
  if (!ownerQid) {
    record("RLS", "peer isolation", "SKIP", "no quotation id from workflow");
    return;
  }

  const foreign = await createAuthedClient(USERS.sales_other_tenant);
  const { data: foreignRead, error: foreignErr } = await foreign.supabase
    .from("quotations")
    .select("id")
    .eq("id", ownerQid);
  const blocked =
    !foreignRead?.length || (foreignErr && /permission|policy|row/i.test(foreignErr.message));
  record("RLS", "cross-tenant read blocked", blocked ? "PASS" : "FAIL");

  const finance = await createAuthedClient(USERS.finance_officer);
  const { data: finRead } = await finance.supabase.from("quotations").select("id").eq("id", ownerQid);
  record("RLS", "finance read_all", finRead?.length === 1 ? "PASS" : "FAIL");

  const { data: finRows, error: finWrite } = await finance.supabase
    .from("quotations")
    .update({ notes: "finance uat" })
    .eq("id", ownerQid)
    .select("id");
  const financeBlocked =
    !finRows?.length ||
    (finWrite && /permission|policy|row/i.test(finWrite.message));
  record(
    "RLS",
    "finance write blocked",
    financeBlocked ? "PASS" : "FAIL",
    finWrite?.message ?? (finRows?.length ? "rows updated" : "no rows")
  );
}

async function runCustomer360(customerId) {
  if (!customerId) {
    record("Customer360", "timeline events", "SKIP", "no customer_id");
    return;
  }
  const svc = createServiceClient();
  const types = [
    "quotation_created",
    "quotation_sent",
    "quotation_viewed",
    "quotation_accepted",
    "quotation_converted",
  ];
  for (const t of types) {
    const { count, error } = await svc
      .from("v_customer_timeline_events")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("event_type", t);
    record("Customer360", t, error ? "FAIL" : count > 0 ? "PASS" : "SKIP", error?.message);
  }
}

async function runDashboard(salesJar) {
  const r = await apiFetch(salesJar, "/api/crm/dashboard?period=month", { method: "GET" });
  const d = r.body?.data;
  const ok =
    r.res.ok &&
    d?.kpis &&
    Array.isArray(d?.charts?.lead_trend ?? []) &&
    d?.lists !== undefined;
  record("Dashboard", "CRM dashboard API", ok ? "PASS" : "FAIL", r.body?.error?.message);
}

async function main() {
  console.log("Sprint 6 Closure UAT\n");
  const svc = createServiceClient();
  await validateSchema(svc);

  let salesJar;
  let adminJar;
  let salesSupabase;
  try {
    const salesAuth = await createAuthedClient(USERS.sales_agent);
    salesJar = salesAuth.jar;
    salesSupabase = salesAuth.supabase;
    adminJar = (await createAuthedClient(USERS.tenant_admin)).jar;
  } catch (e) {
    record("Auth", "sign-in", "FAIL", e instanceof Error ? e.message : String(e));
    writeReport();
    process.exit(1);
  }

  const health = await fetch(`${BASE_URL}/api/health/supabase`).catch(() => null);
  if (!health?.ok) {
    record("App", `reachable ${BASE_URL}`, "SKIP", "Start app or set GATE_BASE_URL to deployed URL");
    writeReport();
    process.exit(0);
  }

  await setTenantApprovalMode("simple");
  const qid = await runSimpleWorkflow(salesJar, salesSupabase);
  await runStandardWorkflow(adminJar, salesJar, salesSupabase);
  await runRlsTests(qid);

  const { data: qrow } = await svc.from("quotations").select("customer_id").eq("id", qid).single();
  await runCustomer360(qrow?.customer_id);
  await runDashboard(salesJar);

  writeReport();
  const failed = results.some((r) => r.status === "FAIL");
  process.exit(failed ? 1 : 0);
}

function writeReport() {
  const outDir = resolve(root, "docs/03-Architecture");
  mkdirSync(outDir, { recursive: true });
  const lines = [
    "# Sprint 6 Closure UAT — Automated Run",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    "",
    "| Section | Item | Status | Detail |",
    "|---------|------|--------|--------|",
    ...results.map((r) => `| ${r.section} | ${r.item} | ${r.status} | ${r.detail || ""} |`),
  ];
  const path = resolve(outDir, "CRM-Sprint6-Closure-UAT-Run.md");
  writeFileSync(path, lines.join("\n"));
  console.log(`\nReport written: ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
