/**
 * Production environment validation (Sprint 9E).
 * Detects mock flags, dev URLs, missing secrets, and forbidden production config.
 *
 * Usage:
 *   node scripts/validate-production-env.mjs
 *   PRODUCTION_CHECK=1 node scripts/validate-production-env.mjs
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const isProductionCheck = process.env.PRODUCTION_CHECK === "1" || process.env.NODE_ENV === "production";
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

function record(category, item, status, detail) {
  results.push({ category, item, status, detail });
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "WARN";
  console.log(`${mark}: [${category}] ${item}${detail ? ` — ${detail}` : ""}`);
}

function env(key) {
  return process.env[key]?.trim() ?? "";
}

function isTruthyFlag(key) {
  const v = env(key).toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function isDevUrl(value) {
  if (!value) return false;
  return (
    value.includes("localhost") ||
    value.includes("127.0.0.1") ||
    value.includes(".local") ||
    value.startsWith("http://")
  );
}

const REQUIRED_PRODUCTION = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "ANTHROPIC_API_KEY",
];

const REQUIRED_IF_EMAIL = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];
const REQUIRED_IF_PAYMENTS = ["PAYMOB_API_KEY", "PAYMOB_INTEGRATION_ID", "PAYMOB_HMAC_SECRET"];
const REQUIRED_IF_WHATSAPP = [
  "WHATSAPP_META_PHONE_NUMBER_ID",
  "WHATSAPP_META_ACCESS_TOKEN",
  "WHATSAPP_META_APP_SECRET",
  "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
];

const FORBIDDEN_IN_PRODUCTION = [
  { key: "WHATSAPP_MOCK_MODE", when: () => isTruthyFlag("WHATSAPP_MOCK_MODE") },
  { key: "PAYMOB_MOCK_MODE", when: () => isTruthyFlag("PAYMOB_MOCK_MODE") },
  { key: "PAYMOB_MOCK_WEBHOOKS", when: () => isTruthyFlag("PAYMOB_MOCK_WEBHOOKS") },
  { key: "NEXT_PUBLIC_PAYMOB_MOCK_MODE", when: () => isTruthyFlag("NEXT_PUBLIC_PAYMOB_MOCK_MODE") },
  { key: "SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC_*", when: () => false },
];

const DEV_ONLY_OK = [
  "GATE_BASE_URL",
  "E2E_BASE_URL",
  "GATE_TEST_PASSWORD",
  "PORTAL_TEST_EMAIL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

console.log(`Production env validation — mode: ${isProductionCheck ? "PRODUCTION" : "LOCAL/DEV"}\n`);

for (const key of REQUIRED_PRODUCTION) {
  if (!env(key) && !env(key.replace("PUBLISHABLE_KEY", "ANON_KEY"))) {
    record("Required", key, isProductionCheck ? "FAIL" : "WARN", "missing");
  } else {
    record("Required", key, "PASS");
  }
}

const pubKey = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (pubKey && pubKey.length < 20) {
  record("Required", "Supabase public key", "FAIL", "value too short");
}

if (!env("SUPABASE_SERVICE_ROLE_KEY")) {
  record("Required", "SUPABASE_SERVICE_ROLE_KEY", isProductionCheck ? "WARN" : "PASS", "needed for admin scripts / worker");
}

if (isProductionCheck) {
  for (const key of REQUIRED_IF_EMAIL) {
    record("Email", key, env(key) ? "PASS" : "FAIL", env(key) ? undefined : "missing for transactional email");
  }
  for (const key of REQUIRED_IF_PAYMENTS) {
    record("Payments", key, env(key) ? "PASS" : "WARN", env(key) ? undefined : "payments will stay in mock mode");
  }
  if (!isTruthyFlag("WHATSAPP_MOCK_MODE") && !env("WHATSAPP_META_ACCESS_TOKEN")) {
    record("WhatsApp", "WHATSAPP_META_ACCESS_TOKEN", "WARN", "mock mode implied when token unset");
  }
  for (const key of REQUIRED_IF_WHATSAPP) {
    if (!isTruthyFlag("WHATSAPP_MOCK_MODE")) {
      record("WhatsApp", key, env(key) ? "PASS" : "FAIL", "required when not in mock mode");
    }
  }
}

for (const { key, when } of FORBIDDEN_IN_PRODUCTION) {
  if (when()) {
    record("Forbidden", key, isProductionCheck ? "FAIL" : "WARN", "must be disabled in production");
  } else {
    record("Forbidden", key, "PASS");
  }
}

const siteUrl = env("NEXT_PUBLIC_SITE_URL") || env("NEXT_PUBLIC_APP_URL");
if (siteUrl && isDevUrl(siteUrl)) {
  record("URLs", "NEXT_PUBLIC_SITE_URL", isProductionCheck ? "FAIL" : "WARN", siteUrl);
} else if (siteUrl) {
  record("URLs", "NEXT_PUBLIC_SITE_URL", "PASS", siteUrl);
} else {
  record("URLs", "NEXT_PUBLIC_SITE_URL", isProductionCheck ? "FAIL" : "WARN", "missing");
}

const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
if (supabaseUrl && isDevUrl(supabaseUrl)) {
  record("URLs", "NEXT_PUBLIC_SUPABASE_URL", "WARN", "local Supabase — not for pilot production");
}

if (!env("CRON_SECRET") || env("CRON_SECRET").length < 16) {
  record("Cron", "CRON_SECRET strength", isProductionCheck ? "FAIL" : "WARN", "use 32+ random bytes");
} else {
  record("Cron", "CRON_SECRET strength", "PASS");
}

if (isTruthyFlag("PAYMOB_MOCK_MODE") || !env("PAYMOB_API_KEY")) {
  record("Payments", "Live Paymob", isProductionCheck ? "FAIL" : "WARN", "mock or missing API key");
} else {
  record("Payments", "Live Paymob", "PASS");
}

if (isTruthyFlag("WHATSAPP_MOCK_MODE") || !env("WHATSAPP_META_ACCESS_TOKEN")) {
  record("WhatsApp", "Live Meta API", isProductionCheck ? "FAIL" : "WARN", "mock or missing token");
} else {
  record("WhatsApp", "Live Meta API", "PASS");
}

for (const key of DEV_ONLY_OK) {
  if (env(key) && isProductionCheck) {
    record("DevOnly", key, "WARN", "test gate variable present in production check");
  }
}

const outPath = resolve(root, "scripts/production-env-validation-results.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), productionMode: isProductionCheck, results }, null, 2)
);

const fails = results.filter((r) => r.status === "FAIL").length;
const warns = results.filter((r) => r.status === "WARN").length;
console.log(`\nResults: ${outPath}`);
console.log(fails === 0 ? `VALIDATION: PASS (${warns} warnings)` : `VALIDATION: FAIL (${fails} failures, ${warns} warnings)`);
process.exit(fails > 0 && isProductionCheck ? 1 : 0);
