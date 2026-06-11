/**
 * Sprint 5 gate — HTTP API security + performance (staging or local app).
 *
 * Usage:
 *   GATE_BASE_URL=http://localhost:3099 node scripts/run-sprint5-gate-http.mjs
 *
 * Requires .env.local (Supabase URL + anon key). Optional GATE_TEST_PASSWORD.
 */

import { createClient } from "@supabase/supabase-js";
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
  foreign_sales: process.env.GATE_FOREIGN_EMAIL ?? "wp3a-foreign@demo.travelos.local",
};

const CUSTOMERS = {
  small: "00000000-0005-4000-8000-000000000004",
  medium: "00000000-0005-4000-8000-000000000007",
  heavy: "00000000-00ea-4000-8000-000000000001",
  foreignProbe: "00000000-0005-4000-8000-000000000001",
  unknown: "00000000-0000-4000-8000-000000000099",
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
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key in .env.local"
    );
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
  if (error) {
    throw new Error(`signIn ${email}: ${error.message}`);
  }
  if (!data.session) {
    throw new Error(`signIn ${email}: no session`);
  }

  return { jar, supabase };
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
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  return { status: res.status, ms, bytes: buf.length, body, isJson };
}

async function main() {
  console.log(`Sprint 5 HTTP gate — ${BASE_URL}\n`);

  let adminJar;
  let foreignJar;
  try {
    ({ jar: adminJar } = await createAuthedClient(USERS.tenant_admin));
    record("Setup", "tenant_admin sign-in", "PASS");
  } catch (e) {
    record("Setup", "tenant_admin sign-in", "FAIL", String(e.message ?? e));
    process.exit(1);
  }

  try {
    ({ jar: foreignJar } = await createAuthedClient(USERS.foreign_sales));
    record("Setup", "foreign_sales sign-in", "PASS");
  } catch (e) {
    record("Setup", "foreign_sales sign-in", "FAIL", String(e.message ?? e));
    foreignJar = null;
  }

  if (foreignJar) {
    const cross = await fetchApi(foreignJar, `/api/customers/${CUSTOMERS.foreignProbe}/360`);
    const crossOk =
      cross.status === 404 ||
      (cross.isJson && cross.body?.error?.code === "NOT_FOUND");
    record(
      "API security",
      "cross-tenant customer 404",
      crossOk ? "PASS" : "FAIL",
      `status=${cross.status} json=${cross.isJson}`
    );
  }

  // RLS: foreign JWT cannot read home-tenant customer row
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const pub = createClient(url, anon, { auth: { persistSession: false } });
    const { data: auth } = await pub.auth.signInWithPassword({
      email: USERS.foreign_sales,
      password: PASSWORD,
    });
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
    });
    const { data: row } = await userClient
      .from("customers")
      .select("id")
      .eq("id", CUSTOMERS.foreignProbe)
      .maybeSingle();
    record(
      "API security",
      "cross-tenant RLS blocks customer row",
      row === null ? "PASS" : "FAIL",
      row ? "row visible" : "no row"
    );
  } catch (e) {
    record("API security", "cross-tenant RLS blocks customer row", "FAIL", String(e.message ?? e));
  }

  const unknown = await fetchApi(adminJar, `/api/customers/${CUSTOMERS.unknown}/360`);
  const unknownOk =
    unknown.status === 404 ||
    (unknown.isJson && unknown.body?.error?.code === "NOT_FOUND");
  record(
    "API security",
    "unknown customer 404",
    unknownOk ? "PASS" : "FAIL",
    `status=${unknown.status} json=${unknown.isJson}`
  );

  // Warm up app + DB connection
  await fetchApi(adminJar, `/api/customers/${CUSTOMERS.small}/360`);

  for (const label of ["small", "medium", "heavy"]) {
    const id = CUSTOMERS[label];
    const res = await fetchApi(adminJar, `/api/customers/${id}/360`);
    const preview = res.body?.data?.timeline_preview;
    const previewCount = Array.isArray(preview) ? preview.length : 0;
    const timelineMeta = res.body?.data?.meta?.timeline_event_count;
    const timelineCount =
      typeof timelineMeta === "number" ? timelineMeta : previewCount;

    if (res.status !== 200) {
      record("Performance", `GET 360 ${label} status`, "FAIL", `status=${res.status}`);
      continue;
    }
    record("Performance", `GET 360 ${label} status`, "PASS");
    record(
      "Performance",
      `GET 360 ${label} time`,
      res.ms < 3000 ? "PASS" : "FAIL",
      `${res.ms}ms`
    );
    record(
      "Performance",
      `GET 360 ${label} size`,
      res.bytes < 200 * 1024 ? "PASS" : "FAIL",
      `${Math.round(res.bytes / 1024)}KB timeline_count≈${timelineCount}`
    );
  }

  for (const [role, email] of [
    ["sales_agent", USERS.sales_agent],
    ["finance_officer", USERS.finance_officer],
  ]) {
    try {
      const { jar } = await createAuthedClient(email);
      const res = await fetchApi(jar, `/api/customers/${CUSTOMERS.medium}/360`);
      const financial = res.body?.data?.meta?.permissions?.financial === true;
      const expected = role === "finance_officer";
      record(
        "API financial gating",
        `${role} financial flag`,
        financial === expected ? "PASS" : "FAIL",
        `financial=${financial}`
      );
    } catch (e) {
      record("API financial gating", `${role} sign-in`, "FAIL", String(e.message ?? e));
    }
  }

  const timeline = await fetchApi(
    adminJar,
    `/api/customers/${CUSTOMERS.heavy}/360/timeline?limit=200`
  );
  const rows = Array.isArray(timeline.body?.data) ? timeline.body.data.length : 0;
  record(
    "Worst-case timeline",
    "status 200",
    timeline.status === 200 ? "PASS" : "FAIL",
    `status=${timeline.status}`
  );
  record(
    "Worst-case timeline",
    "query duration",
    timeline.ms < 3000 ? "PASS" : "FAIL",
    `${timeline.ms}ms`
  );
  record(
    "Worst-case timeline",
    "payload size",
    timeline.bytes < 200 * 1024 ? "PASS" : "FAIL",
    `${Math.round(timeline.bytes / 1024)}KB`
  );
  record(
    "Worst-case timeline",
    "returned rows",
    rows > 50 ? "PASS" : "FAIL",
    String(rows)
  );

  mkdirSync(resolve(root, "scripts"), { recursive: true });
  const outPath = resolve(root, "scripts/sprint5-gate-http-results.json");
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
  console.log("\nAll HTTP gate checks PASS");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
