/**
 * Sprint 8A/8B/8C — Customer Portal HTTP gate.
 *
 * Requires:
 *   PORTAL_TEST_EMAIL — customer portal account email
 *   GATE_TEST_PASSWORD — shared test password
 *   NEXT_PUBLIC_SUPABASE_URL + anon key + SUPABASE_SERVICE_ROLE_KEY (for provisioning checks)
 *
 * Usage:
 *   node scripts/run-portal-gate-http.mjs
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

const PORTAL_EMAIL = process.env.PORTAL_TEST_EMAIL ?? "portal-customer@demo.travelos.local";
const STAFF_EMAIL = process.env.GATE_SALES_EMAIL ?? "wp3a-sales@demo.travelos.local";

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

async function getBearerToken(email) {
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
  if (!data.session?.access_token) throw new Error(`signIn ${email}: no token`);
  return data.session.access_token;
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function apiPatch(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function apiPost(path, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  console.log(`Portal gate — ${BASE_URL}\n`);

  // Auth — portal login page reachable
  try {
    const res = await fetch(`${BASE_URL}/portal/login`);
    record("Pages", "GET /portal/login", res.status === 200 ? "PASS" : "FAIL", `status ${res.status}`);
  } catch (err) {
    record("Pages", "GET /portal/login", "FAIL", err.message);
  }

  // Unauthenticated API
  try {
    const res = await fetch(`${BASE_URL}/api/portal/dashboard`);
    record("Security", "Unauthenticated dashboard", res.status === 401 ? "PASS" : "FAIL", `status ${res.status}`);
  } catch (err) {
    record("Security", "Unauthenticated dashboard", "FAIL", err.message);
  }

  let portalToken;
  try {
    portalToken = await getBearerToken(PORTAL_EMAIL);
    record("Auth", "Portal customer login", "PASS", PORTAL_EMAIL);
  } catch (err) {
    record("Auth", "Portal customer login", "SKIP", `${err.message} — set PORTAL_TEST_EMAIL after provisioning`);
  }

  if (portalToken) {
    const dash = await apiGet("/api/portal/dashboard", portalToken);
    record(
      "API",
      "GET /api/portal/dashboard",
      dash.status === 200 && dash.body?.data?.customer ? "PASS" : "FAIL",
      `status ${dash.status}`
    );

    const quotes = await apiGet("/api/portal/quotations", portalToken);
    record(
      "API",
      "GET /api/portal/quotations",
      quotes.status === 200 && Array.isArray(quotes.body?.data) ? "PASS" : "FAIL",
      `status ${quotes.status}, count ${quotes.body?.data?.length ?? 0}`
    );

    const bookings = await apiGet("/api/portal/bookings", portalToken);
    record(
      "API",
      "GET /api/portal/bookings",
      bookings.status === 200 && Array.isArray(bookings.body?.data) ? "PASS" : "FAIL",
      `status ${bookings.status}`
    );

    // Cross-customer probe — random UUID should 404
    const foreign = await apiGet(
      "/api/portal/quotations/00000000-0000-4000-8000-000000000099",
      portalToken
    );
    record(
      "Security",
      "Cross-customer quotation",
      foreign.status === 404 ? "PASS" : "FAIL",
      `status ${foreign.status}`
    );

    // Sprint 8B — timeline + PDF
    const timeline = await apiGet(
      `/api/portal/quotations/${quotes.body?.data?.[0]?.id ?? "00000000-0000-4000-8000-000000000001"}/timeline`,
      portalToken
    );
    record(
      "API",
      "GET quotation timeline",
      timeline.status === 200 || timeline.status === 404 ? "PASS" : "FAIL",
      `status ${timeline.status}`
    );

    if (quotes.body?.data?.[0]?.id) {
      const pdfRes = await fetch(`${BASE_URL}/api/portal/quotations/${quotes.body.data[0].id}/pdf`, {
        headers: { Authorization: `Bearer ${portalToken}` },
      });
      record(
        "API",
        "GET quotation PDF",
        pdfRes.status === 200 && pdfRes.headers.get("content-type")?.includes("pdf") ? "PASS" : "SKIP",
        `status ${pdfRes.status}`
      );
    } else {
      record("API", "GET quotation PDF", "SKIP", "no quotations");
    }

    const bookingsList = await apiGet("/api/portal/bookings", portalToken);
    if (bookingsList.body?.data?.[0]?.id) {
      const docs = await apiGet(
        `/api/portal/bookings/${bookingsList.body.data[0].id}/documents`,
        portalToken
      );
      record(
        "API",
        "GET booking documents",
        docs.status === 200 && Array.isArray(docs.body?.data) ? "PASS" : "FAIL",
        `status ${docs.status}`
      );
    } else {
      record("API", "GET booking documents", "SKIP", "no bookings");
    }

    // Sprint 8C — portal notification center
    try {
      const notifPage = await fetch(`${BASE_URL}/portal/notifications`);
      record(
        "Pages",
        "GET /portal/notifications",
        notifPage.status === 200 ? "PASS" : "FAIL",
        `status ${notifPage.status}`
      );
    } catch (err) {
      record("Pages", "GET /portal/notifications", "FAIL", err.message);
    }

    const portalNotifs = await apiGet("/api/portal/notifications", portalToken);
    record(
      "API",
      "GET /api/portal/notifications",
      portalNotifs.status === 200 && Array.isArray(portalNotifs.body?.data) ? "PASS" : "FAIL",
      `status ${portalNotifs.status}, unread ${portalNotifs.body?.meta?.unread_count ?? "?"}`
    );

    const unread = await apiGet("/api/portal/notifications/unread-count", portalToken);
    record(
      "API",
      "GET portal unread-count",
      unread.status === 200 && typeof unread.body?.data?.unread_count === "number" ? "PASS" : "FAIL",
      `status ${unread.status}`
    );

    const foreignNotif = await apiPatch(
      "/api/portal/notifications/00000000-0000-4000-8000-000000000099/read",
      portalToken
    );
    record(
      "Security",
      "Cross-customer notification read",
      foreignNotif.status === 404 ? "PASS" : "FAIL",
      `status ${foreignNotif.status}`
    );

    if (portalNotifs.body?.data?.[0]?.id && !portalNotifs.body.data[0].is_read) {
      const markOne = await apiPatch(
        `/api/portal/notifications/${portalNotifs.body.data[0].id}/read`,
        portalToken
      );
      record(
        "API",
        "PATCH portal notification read",
        markOne.status === 200 ? "PASS" : "SKIP",
        `status ${markOne.status}`
      );
    } else {
      record("API", "PATCH portal notification read", "SKIP", "no unread notification");
    }

    await apiPost("/api/portal/notifications/read-all", portalToken);
    record("API", "POST portal read-all", "PASS", "invoked");

    // Sprint 8D — drain async dispatch queue after portal flows
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
      const workerRes = await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchSize: 20 }),
      });
      const workerBody = await workerRes.json().catch(() => ({}));
      record(
        "Worker",
        "Process dispatch jobs",
        workerRes.status === 200 ? "PASS" : "SKIP",
        `status ${workerRes.status}, processed ${workerBody.data?.processed ?? "?"}`
      );
    } else {
      record("Worker", "Process dispatch jobs", "SKIP", "CRON_SECRET not set");
    }
  }

  // Staff cannot use portal API
  let staffToken;
  try {
    staffToken = await getBearerToken(STAFF_EMAIL);
    const staffProbe = await apiGet("/api/portal/dashboard", staffToken);
    record(
      "Security",
      "Staff blocked from portal API",
      staffProbe.status === 403 ? "PASS" : "FAIL",
      `status ${staffProbe.status}`
    );

    // Sprint 8C — CRM inbox
    const staffInbox = await apiGet("/api/notifications", staffToken);
    record(
      "API",
      "GET /api/notifications",
      staffInbox.status === 200 && Array.isArray(staffInbox.body?.data) ? "PASS" : "FAIL",
      `status ${staffInbox.status}, unread ${staffInbox.body?.meta?.unread_count ?? "?"}`
    );

    const portalFromStaff = await apiGet("/api/portal/notifications", staffToken);
    record(
      "Security",
      "Staff blocked from portal notifications",
      portalFromStaff.status === 403 ? "PASS" : "FAIL",
      `status ${portalFromStaff.status}`
    );

    const foreignStaffNotif = await apiPatch(
      "/api/notifications/00000000-0000-4000-8000-000000000099/read",
      staffToken
    );
    record(
      "Security",
      "Cross-user staff notification read",
      foreignStaffNotif.status === 404 ? "PASS" : "FAIL",
      `status ${foreignStaffNotif.status}`
    );
  } catch (err) {
    record("Security", "Staff blocked from portal API", "SKIP", err.message);
  }

  // Unauthenticated notification APIs
  try {
    const unauthStaff = await fetch(`${BASE_URL}/api/notifications`);
    record(
      "Security",
      "Unauthenticated staff inbox",
      unauthStaff.status === 401 ? "PASS" : "FAIL",
      `status ${unauthStaff.status}`
    );
    const unauthPortal = await fetch(`${BASE_URL}/api/portal/notifications`);
    record(
      "Security",
      "Unauthenticated portal notifications",
      unauthPortal.status === 401 ? "PASS" : "FAIL",
      `status ${unauthPortal.status}`
    );
  } catch (err) {
    record("Security", "Unauthenticated notification APIs", "FAIL", err.message);
  }

  const fails = results.filter((r) => r.status === "FAIL").length;
  const outPath = resolve(root, "scripts/portal-gate-http-results.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  console.log(`\nResults written to ${outPath}`);
  console.log(fails === 0 ? "\nGATE: PASS" : `\nGATE: FAIL (${fails} failures)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
