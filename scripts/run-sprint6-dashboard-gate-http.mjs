/**
 * Sprint 6 Phase 1 (034) — CRM dashboard HTTP gate.
 *
 * Usage:
 *   GATE_BASE_URL=http://localhost:3099 node scripts/run-sprint6-dashboard-gate-http.mjs
 */

import { createServerClient } from "@supabase/ssr";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";
const BASE_URL = (process.env.GATE_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://localhost:3099").replace(
  /\/$/,
  ""
);

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

function record(section, item, status, detail) {
  results.push({ section, item, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "SKIP";
  console.log(`${mark}: [${section}] ${item}${detail ? ` — ${detail}` : ""}`);
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function createAuthedClient(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key");
  }

  const jar = {};
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return Object.entries(jar).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          if (value) jar[name] = value;
          else delete jar[name];
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  if (!data.session) throw new Error(`signIn ${email}: no session`);
  return { jar };
}

async function fetchApi(jar, path) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const ms = Date.now() - start;
  let body = null;
  try {
    body = JSON.parse(buf.toString("utf8"));
  } catch {
    body = null;
  }
  return { status: res.status, ms, bytes: buf.length, body };
}

async function main() {
  console.log(`Sprint 6 CRM dashboard HTTP gate — ${BASE_URL}\n`);

  let adminJar;
  try {
    ({ jar: adminJar } = await createAuthedClient(USERS.tenant_admin));
    record("Setup", "tenant_admin sign-in", "PASS");
  } catch (e) {
    record("Setup", "tenant_admin sign-in", "FAIL", String(e.message ?? e));
    process.exit(1);
  }

  await fetchApi(adminJar, "/api/crm/dashboard?period=month");

  for (const period of ["month", "quarter"]) {
    const res = await fetchApi(adminJar, `/api/crm/dashboard?period=${period}`);
    record(
      "API",
      `GET dashboard period=${period} status`,
      res.status === 200 ? "PASS" : "FAIL",
      `status=${res.status}`
    );
    if (res.status === 200) {
      const kpis = res.body?.data?.kpis;
      const hasShape =
        kpis &&
        typeof kpis.leads_this_month === "number" &&
        Array.isArray(res.body?.data?.charts?.lead_trend);
      record(
        "API",
        `GET dashboard period=${period} payload`,
        hasShape ? "PASS" : "FAIL",
        hasShape ? "kpis+charts ok" : "missing fields"
      );
    }
  }

  const perf = await fetchApi(adminJar, "/api/crm/dashboard?period=quarter");
  record(
    "Performance",
    "GET dashboard duration",
    perf.status === 200 && perf.ms < 2000 ? "PASS" : "FAIL",
    `${perf.ms}ms`
  );
  record(
    "Performance",
    "GET dashboard payload size",
    perf.bytes < 128 * 1024 ? "PASS" : "FAIL",
    `${Math.round(perf.bytes / 1024)}KB`
  );

  const adminRes = await fetchApi(adminJar, "/api/crm/dashboard?period=month");
  const adminForecast = adminRes.body?.data?.kpis?.forecast_revenue;
  record(
    "Financial gating",
    "tenant_admin revenue KPIs",
    adminRes.status === 200 && adminForecast !== null && adminForecast !== undefined
      ? "PASS"
      : "FAIL",
    `forecast=${adminForecast}`
  );

  for (const [role, email] of [
    ["sales_agent", USERS.sales_agent],
    ["finance_officer", USERS.finance_officer],
  ]) {
    try {
      const { jar } = await createAuthedClient(email);
      const res = await fetchApi(jar, "/api/crm/dashboard?period=month");
      const forecast = res.body?.data?.kpis?.forecast_revenue;
      const closed = res.body?.data?.kpis?.closed_revenue;
      const expectFinancial = role === "finance_officer" || role === "tenant_admin";
      const hasFinancial =
        forecast !== null &&
        forecast !== undefined &&
        closed !== null &&
        closed !== undefined;
      record(
        "Financial gating",
        `${role} revenue KPIs`,
        hasFinancial === expectFinancial ? "PASS" : "FAIL",
        `forecast=${forecast} closed=${closed}`
      );
      const revenueChart = res.body?.data?.charts?.revenue_forecast;
      const chartOk = expectFinancial
        ? Array.isArray(revenueChart)
        : Array.isArray(revenueChart) && revenueChart.length === 0;
      record(
        "Financial gating",
        `${role} revenue_forecast chart`,
        chartOk ? "PASS" : "FAIL",
        `len=${Array.isArray(revenueChart) ? revenueChart.length : "n/a"}`
      );
    } catch (e) {
      record("Financial gating", `${role} sign-in`, "FAIL", String(e.message ?? e));
    }
  }

  mkdirSync(resolve(root, "scripts"), { recursive: true });
  const outPath = resolve(root, "scripts/sprint6-dashboard-gate-http-results.json");
  writeFileSync(
    outPath,
    JSON.stringify({ baseUrl: BASE_URL, generatedAt: new Date().toISOString(), results }, null, 2)
  );
  console.log(`\nWrote ${outPath}`);

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length > 0) {
    console.error(`\n${failed.length} gate check(s) FAILED`);
    process.exit(1);
  }
  console.log("\nAll CRM dashboard HTTP gate checks PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
