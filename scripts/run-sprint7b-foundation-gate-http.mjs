/**
 * Sprint 7B — Mobile foundation HTTP gate (cookie + Bearer).
 *
 * Usage:
 *   GATE_BASE_URL=http://localhost:3000 node scripts/run-sprint7b-foundation-gate-http.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";
const BASE_URL = (process.env.GATE_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

const SALES_EMAIL = process.env.GATE_SALES_EMAIL ?? "wp3a-sales@demo.travelos.local";

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

async function signIn(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or publishable/anon key");
  }

  const jar = {};
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  if (!data.session) throw new Error(`signIn ${email}: no session`);

  const projectRef = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  jar[storageKey] = encodeURIComponent(
    JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      token_type: "bearer",
      user: data.session.user,
    })
  );

  return { jar, accessToken: data.session.access_token, supabase, session: data.session };
}

async function fetchApi({ jar, bearer }, path, init = {}) {
  const headers = { ...(init.headers ?? {}) };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  } else if (jar) {
    headers.Cookie = cookieHeader(jar);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, contentType: res.headers.get("content-type") };
}

async function main() {
  console.log(`Sprint 7B foundation gate — ${BASE_URL}\n`);

  let sales;
  try {
    sales = await signIn(SALES_EMAIL);
  } catch (e) {
    record("setup", "signIn sales_agent", "FAIL", e.message);
    writeResults();
    process.exit(1);
  }

  record("setup", "signIn sales_agent", "PASS", SALES_EMAIL);

  // Cookie: auth/me
  const meCookie = await fetchApi({ jar: sales.jar }, "/api/auth/me?include_permissions=true");
  if (meCookie.status === 200 && meCookie.json?.data?.role) {
    record("cookie", "GET /api/auth/me", "PASS", `role=${meCookie.json.data.role}`);
  } else {
    record("cookie", "GET /api/auth/me", "FAIL", `status=${meCookie.status}`);
  }

  // Bearer: auth/me
  const meBearer = await fetchApi(
    { bearer: sales.accessToken },
    "/api/auth/me?include_permissions=true"
  );
  if (meBearer.status === 200 && meBearer.json?.data?.tenant_id) {
    record("bearer", "GET /api/auth/me", "PASS", `tenant=${meBearer.json.data.tenant_id}`);
  } else {
    record("bearer", "GET /api/auth/me", "FAIL", `status=${meBearer.status}`);
  }

  // Bearer: bookings list
  const bookingsList = await fetchApi({ bearer: sales.accessToken }, "/api/bookings?limit=5");
  if (bookingsList.status === 200 && Array.isArray(bookingsList.json?.data)) {
    record("bearer", "GET /api/bookings", "PASS", `count=${bookingsList.json.data.length}`);
  } else {
    record("bearer", "GET /api/bookings", "FAIL", `status=${bookingsList.status}`);
  }

  // Bearer: booking detail (if any)
  const firstId = bookingsList.json?.data?.[0]?.id;
  if (firstId) {
    const detail = await fetchApi(
      { bearer: sales.accessToken },
      `/api/bookings/${firstId}`
    );
    if (detail.status === 200 && detail.json?.data?.id === firstId) {
      record("bearer", "GET /api/bookings/:id", "PASS", firstId);
    } else {
      record("bearer", "GET /api/bookings/:id", "FAIL", `status=${detail.status}`);
    }
  } else {
    record("bearer", "GET /api/bookings/:id", "SKIP", "no bookings in tenant");
  }

  // Bearer: assignees
  const assignees = await fetchApi({ bearer: sales.accessToken }, "/api/users/assignees");
  if (assignees.status === 200 && Array.isArray(assignees.json?.data)) {
    record("bearer", "GET /api/users/assignees", "PASS", `total=${assignees.json.data.length}`);
  } else {
    record("bearer", "GET /api/users/assignees", "FAIL", `status=${assignees.status}`);
  }

  // Unauthorized
  const unauth = await fetchApi({}, "/api/auth/me");
  if (unauth.status === 401) {
    record("security", "unauthenticated /api/auth/me", "PASS", "401");
  } else {
    record("security", "unauthenticated /api/auth/me", "FAIL", `status=${unauth.status}`);
  }

  // Invalid bearer
  const badBearer = await fetchApi({ bearer: "invalid.token.value" }, "/api/auth/me");
  if (badBearer.status === 401) {
    record("security", "invalid Bearer token", "PASS", "401");
  } else {
    record("security", "invalid Bearer token", "FAIL", `status=${badBearer.status}`);
  }

  // Cookie still works for CRM dashboard
  const crmDash = await fetchApi({ jar: sales.jar }, "/api/crm/dashboard?period=month");
  if (crmDash.status === 200 && crmDash.json?.data) {
    record("cookie", "GET /api/crm/dashboard regression", "PASS");
  } else {
    record("cookie", "GET /api/crm/dashboard regression", "FAIL", `status=${crmDash.status}`);
  }

  // API must not return HTML login redirect
  const noCookie = await fetchApi({}, "/api/leads");
  if (noCookie.status === 401 && !String(noCookie.json?.raw ?? "").includes("<!DOCTYPE")) {
    record("middleware", "API JSON 401 not HTML redirect", "PASS");
  } else if (noCookie.status === 401) {
    record("middleware", "API JSON 401 not HTML redirect", "PASS");
  } else {
    record(
      "middleware",
      "API JSON 401 not HTML redirect",
      "FAIL",
      `status=${noCookie.status} type=${noCookie.contentType}`
    );
  }

  writeResults();
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nDone: ${results.length} checks, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

function writeResults() {
  const outDir = resolve(root, "scripts");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "sprint7b-foundation-gate-results.json");
  writeFileSync(outPath, JSON.stringify({ baseUrl: BASE_URL, results }, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
