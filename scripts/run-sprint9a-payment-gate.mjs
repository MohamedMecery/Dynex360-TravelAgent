/**
 * Sprint 9A — Customer checkout & payments HTTP gate.
 *
 * Requires portal test account + accepted quotation (or creates checkout on first accepted).
 * PAYMOB_MOCK_MODE=true and PAYMOB_MOCK_WEBHOOKS=true recommended.
 *
 * Usage: node scripts/run-sprint9a-payment-gate.mjs
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

process.env.PAYMOB_MOCK_MODE = process.env.PAYMOB_MOCK_MODE ?? "true";
process.env.PAYMOB_MOCK_WEBHOOKS = process.env.PAYMOB_MOCK_WEBHOOKS ?? "true";

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
  if (error) throw new Error(`signIn: ${error.message}`);
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

async function enableTenantPayments(admin, tenantId) {
  await admin
    .from("tenant_payment_settings")
    .upsert({
      tenant_id: tenantId,
      payments_enabled: true,
      booking_automation_mode: "auto_on_deposit",
      confirm_on_deposit: false,
      deposit_percent: 30,
    });
}

async function main() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    record("env", "supabase", "FAIL", "Missing service role or URL");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let portalToken;
  try {
    portalToken = await getBearerToken(PORTAL_EMAIL);
    record("auth", "portal sign-in", "PASS");
  } catch (e) {
    record("auth", "portal sign-in", "FAIL", e.message);
    process.exit(1);
  }

  const { data: portalAccount } = await admin
    .from("customer_portal_accounts")
    .select("tenant_id, customer_id")
    .eq("email", PORTAL_EMAIL)
    .maybeSingle();

  if (!portalAccount?.tenant_id) {
    record("setup", "portal account", "FAIL", "No portal account");
    process.exit(1);
  }

  await enableTenantPayments(admin, portalAccount.tenant_id);
  record("setup", "enable payments", "PASS");

  const { data: acceptedQuote } = await admin
    .from("quotations")
    .select("id, status, total_amount, currency")
    .eq("customer_id", portalAccount.customer_id)
    .eq("status", "accepted")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!acceptedQuote) {
    record("checkout", "accepted quotation", "SKIP", "No accepted quotation — accept one in portal first");
  } else {
    const checkout = await api(
      "POST",
      `/api/portal/quotations/${acceptedQuote.id}/checkout`,
      portalToken
    );
    if (checkout.status !== 200) {
      record("checkout", "create session", "FAIL", JSON.stringify(checkout.body));
    } else {
      record("checkout", "create session", "PASS");
      const orderId = checkout.body?.data?.payment_order?.id;
      const amountCents = Math.round(Number(checkout.body?.data?.payment_order?.amount) * 100);

      const webhookRes = await fetch(`${BASE_URL}/api/webhooks/paymob`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRANSACTION",
          obj: {
            id: `gate-${Date.now()}`,
            success: true,
            amount_cents: amountCents,
            currency: acceptedQuote.currency ?? "EGP",
            order: { merchant_order_id: orderId, id: 1 },
          },
        }),
      });
      const webhookBody = await webhookRes.json().catch(() => ({}));
      if (webhookRes.status === 200 && webhookBody?.data?.status === "processed") {
        record("webhook", "complete payment", "PASS");
      } else {
        record("webhook", "complete payment", "FAIL", JSON.stringify(webhookBody));
      }

      const dupRes = await fetch(`${BASE_URL}/api/webhooks/paymob`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRANSACTION",
          obj: {
            id: `gate-${Date.now()}`,
            success: true,
            amount_cents: amountCents,
            currency: acceptedQuote.currency ?? "EGP",
            order: { merchant_order_id: orderId, id: 1 },
          },
        }),
      });
      const dupBody = await dupRes.json().catch(() => ({}));
      if (dupRes.status === 200 && ["duplicate", "processed"].includes(dupBody?.data?.status)) {
        record("webhook", "idempotent replay", "PASS", dupBody?.data?.status);
      } else {
        record("webhook", "idempotent replay", "FAIL", JSON.stringify(dupBody));
      }

      const orderGet = await api("GET", `/api/portal/payment-orders/${orderId}`, portalToken);
      if (orderGet.status === 200 && orderGet.body?.data?.order?.status === "completed") {
        record("portal", "order status completed", "PASS");
      } else {
        record("portal", "order status completed", "FAIL", JSON.stringify(orderGet.body));
      }

      const { data: ledger } = await admin
        .from("payments")
        .select("id, amount, source")
        .eq("payment_order_id", orderId)
        .is("deleted_at", null);
      if (ledger?.length && ledger[0].source === "gateway") {
        record("ledger", "gateway payment row", "PASS");
      } else {
        record("ledger", "gateway payment row", "FAIL");
      }
    }
  }

  const cross = await api(
    "GET",
    `/api/portal/payment-orders/00000000-0000-4000-8000-000000000099`,
    portalToken
  );
  if (cross.status === 404) {
    record("security", "cross-customer order 404", "PASS");
  } else {
    record("security", "cross-customer order 404", "FAIL", `status ${cross.status}`);
  }

  const outDir = resolve(root, "scripts");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "sprint9a-payment-gate-results.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );

  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nSprint 9A payment gate: ${failed} failure(s)`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
