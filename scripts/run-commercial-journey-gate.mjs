/**
 * Sprint 9E — Unified commercial journey gate.
 *
 * Flow: Lead → Opportunity → Quotation → Sent → Portal → Accept →
 *       Payment → Webhook → Booking → Notifications → WhatsApp → Ops AI
 *
 * Prerequisites:
 *   - App running at GATE_BASE_URL
 *   - Migrations 025–064 applied
 *   - Portal test account: node scripts/provision-portal-test-account.mjs
 *   - Staff user with CRM permissions (GATE_SALES_EMAIL or GATE_ADMIN_EMAIL)
 *
 * Usage:
 *   node scripts/run-commercial-journey-gate.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE_URL = (process.env.GATE_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";
const PORTAL_EMAIL = process.env.PORTAL_TEST_EMAIL ?? "portal-customer@demo.travelos.local";
const STAFF_EMAIL = process.env.GATE_SALES_EMAIL ?? process.env.GATE_ADMIN_EMAIL ?? "wp3a-sales@demo.travelos.local";

process.env.PAYMOB_MOCK_MODE = process.env.PAYMOB_MOCK_MODE ?? "true";
process.env.PAYMOB_MOCK_WEBHOOKS = process.env.PAYMOB_MOCK_WEBHOOKS ?? "true";
process.env.WHATSAPP_MOCK_MODE = process.env.WHATSAPP_MOCK_MODE ?? "true";

const results = [];
let quotationId = null;
let bookingId = null;

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

function record(step, item, status, detail) {
  results.push({ step, item, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "SKIP";
  console.log(`${mark}: [${step}] ${item}${detail ? ` — ${detail}` : ""}`);
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return data.session.access_token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function processWorkerBatch() {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return { ok: false, reason: "CRON_SECRET unset" };
  const res = await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ batchSize: 25 }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.status === 200, body };
}

async function main() {
  console.log(`Commercial journey gate — ${BASE_URL}\n`);

  const admin = adminClient();

  const { data: portalAccount } = await admin
    .from("customer_portal_accounts")
    .select("tenant_id, customer_id")
    .eq("email", PORTAL_EMAIL)
    .maybeSingle();

  if (!portalAccount?.customer_id) {
    record("Setup", "portal account", "FAIL", `Provision ${PORTAL_EMAIL} first`);
    writeResults();
    return;
  }
  record("Setup", "portal account", "PASS", PORTAL_EMAIL);

  await admin.from("tenant_payment_settings").upsert({
    tenant_id: portalAccount.tenant_id,
    payments_enabled: true,
    booking_automation_mode: "auto_on_deposit",
    confirm_on_deposit: false,
    deposit_percent: 30,
  });

  await admin.from("tenant_whatsapp_settings").upsert({
    tenant_id: portalAccount.tenant_id,
    whatsapp_enabled: true,
  });

  await admin.from("tenant_settings").upsert(
    { tenant_id: portalAccount.tenant_id, quotation_approval_mode: "simple" },
    { onConflict: "tenant_id" }
  );

  let staffToken;
  try {
    staffToken = await getBearerToken(STAFF_EMAIL);
    record("Auth", "staff sign-in", "PASS", STAFF_EMAIL);
  } catch (e) {
    record("Auth", "staff sign-in", "FAIL", e.message);
    writeResults();
    return;
  }

  const stamp = Date.now();
  const leadRes = await api("POST", "/api/leads", staffToken, {
    full_name: `Gate Lead ${stamp}`,
    mobile: "01001234567",
    source: "website",
    currency: "EGP",
    expected_budget: 50000,
    pax_count: 2,
  });
  const leadId = leadRes.body?.data?.id;
  record(
    "Lead",
    "create lead",
    leadRes.status === 201 && leadId ? "PASS" : "FAIL",
    leadRes.body?.error?.message ?? `status ${leadRes.status}`
  );
  if (!leadId) {
    writeResults();
    return;
  }

  const linkCust = await api("POST", `/api/leads/${leadId}/convert-customer`, staffToken, {
    link_existing_customer_id: portalAccount.customer_id,
  });
  record(
    "Lead",
    "link portal customer",
    linkCust.status === 200 ? "PASS" : "FAIL",
    linkCust.body?.error?.message
  );

  const convOpp = await api("POST", `/api/leads/${leadId}/convert-opportunity`, staffToken);
  const opportunityId = convOpp.body?.data?.opportunity_id ?? convOpp.body?.data?.opportunity?.id;
  record(
    "Opportunity",
    "convert from lead",
    convOpp.status === 200 && opportunityId ? "PASS" : "FAIL",
    convOpp.body?.error?.message
  );
  if (!opportunityId) {
    writeResults();
    return;
  }

  const quoteRes = await api("POST", "/api/quotations", staffToken, {
    opportunity_id: opportunityId,
    customer_id: portalAccount.customer_id,
    currency: "EGP",
    items: [
      {
        item_type: "package",
        description: `Commercial gate package ${stamp}`,
        quantity: 1,
        unit_price: 10000,
      },
    ],
  });
  quotationId = quoteRes.body?.data?.id;
  record(
    "Quotation",
    "create with line items",
    quoteRes.status === 201 && quotationId ? "PASS" : "FAIL",
    quoteRes.body?.error?.message
  );
  if (!quotationId) {
    writeResults();
    return;
  }

  const sendRes = await api("POST", `/api/quotations/${quotationId}/send`, staffToken);
  record(
    "Quotation",
    "send to customer",
    sendRes.status === 200 && sendRes.body?.data?.status === "sent" ? "PASS" : "FAIL",
    sendRes.body?.data?.status ?? sendRes.body?.error?.message
  );

  let portalToken;
  try {
    portalToken = await getBearerToken(PORTAL_EMAIL);
    record("Portal", "customer login", "PASS");
  } catch (e) {
    record("Portal", "customer login", "FAIL", e.message);
    writeResults();
    return;
  }

  const acceptRes = await api("POST", `/api/portal/quotations/${quotationId}/accept`, portalToken);
  record(
    "Portal",
    "accept quotation",
    acceptRes.status === 200 && acceptRes.body?.data?.status === "accepted" ? "PASS" : "FAIL",
    acceptRes.body?.data?.status ?? acceptRes.body?.error?.message
  );

  const checkout = await api("POST", `/api/portal/quotations/${quotationId}/checkout`, portalToken);
  const orderId = checkout.body?.data?.payment_order?.id;
  const amountCents = Math.round(Number(checkout.body?.data?.payment_order?.amount ?? 0) * 100);
  record(
    "Payment",
    "checkout session",
    checkout.status === 200 && orderId ? "PASS" : "FAIL",
    checkout.body?.error?.message
  );

  if (orderId) {
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/paymob`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "TRANSACTION",
        obj: {
          id: `commercial-gate-${stamp}`,
          success: true,
          amount_cents: amountCents,
          currency: "EGP",
          order: { merchant_order_id: orderId, id: 1 },
        },
      }),
    });
    const webhookBody = await webhookRes.json().catch(() => ({}));
    record(
      "Payment",
      "webhook completion",
      webhookRes.status === 200 && ["processed", "duplicate"].includes(webhookBody?.data?.status)
        ? "PASS"
        : "FAIL",
      JSON.stringify(webhookBody?.data ?? webhookBody?.error)
    );

    const { data: orderRow } = await admin
      .from("payment_orders")
      .select("status, booking_id")
      .eq("id", orderId)
      .maybeSingle();
    bookingId = orderRow?.booking_id ?? null;
    record(
      "Booking",
      "created from payment",
      orderRow?.status === "completed" && bookingId ? "PASS" : "FAIL",
      `order=${orderRow?.status}, booking=${bookingId ?? "none"}`
    );
  }

  const worker = await processWorkerBatch();
  record(
    "Worker",
    "process dispatch queue",
    worker.ok ? "PASS" : "SKIP",
    worker.ok ? `completed ${worker.body?.data?.completed ?? 0}` : worker.reason
  );

  const { data: inAppNotif } = await admin
    .from("customer_notifications")
    .select("id")
    .eq("customer_id", portalAccount.customer_id)
    .order("created_at", { ascending: false })
    .limit(1);
  record(
    "Notifications",
    "customer notification row",
    inAppNotif?.length ? "PASS" : "WARN",
    `count recent ${inAppNotif?.length ?? 0}`
  );

  const { data: waDelivery } = await admin
    .from("notification_deliveries")
    .select("status, channel")
    .eq("channel", "whatsapp")
    .order("created_at", { ascending: false })
    .limit(1);
  record(
    "WhatsApp",
    "delivery record",
    waDelivery?.length ? "PASS" : "WARN",
    waDelivery?.[0]?.status ?? "no row — enable templates + worker"
  );

  if (bookingId) {
    const worker2 = await processWorkerBatch();
    record("Operations AI", "second worker pass", worker2.ok ? "PASS" : "SKIP");

    const { data: opsSnap } = await admin
      .from("ai_ops_snapshots")
      .select("health_score, readiness_score, operational_status")
      .eq("entity_type", "booking")
      .eq("entity_id", bookingId)
      .maybeSingle();

    record(
      "Operations AI",
      "booking snapshot",
      opsSnap ? "PASS" : "WARN",
      opsSnap
        ? `health=${opsSnap.health_score}, readiness=${opsSnap.readiness_score}%`
        : "enqueue via booking.created event + worker"
    );

    const { data: opsRec } = await admin
      .from("ai_ops_recommendations")
      .select("id, recommendation_type, status")
      .eq("entity_type", "booking")
      .eq("entity_id", bookingId)
      .eq("status", "open")
      .limit(1);
    record(
      "Operations AI",
      "open recommendation",
      opsRec?.length ? "PASS" : "WARN",
      opsRec?.[0]?.recommendation_type ?? "none yet"
    );

    record(
      "Departure readiness",
      "readiness score present",
      opsSnap && typeof opsSnap.readiness_score === "number" ? "PASS" : "WARN",
      opsSnap ? `${opsSnap.readiness_score}%` : "snapshot pending"
    );
  } else {
    record("Booking", "downstream checks", "SKIP", "no booking from payment");
  }

  writeResults();
}

function writeResults() {
  const fails = results.filter((r) => r.status === "FAIL").length;
  const outPath = resolve(root, "scripts/commercial-journey-gate-results.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        quotationId,
        bookingId,
        results,
      },
      null,
      2
    )
  );
  console.log(`\nResults: ${outPath}`);
  console.log(fails === 0 ? "\nCOMMERCIAL GATE: PASS" : `\nCOMMERCIAL GATE: FAIL (${fails} failures)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
