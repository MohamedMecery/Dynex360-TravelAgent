/**
 * Provision a customer portal test account (Sprint 8A gate / E2E).
 *
 * Creates auth user + links to an existing customer via link_customer_portal_account RPC.
 *
 * Usage:
 *   PORTAL_TEST_EMAIL=portal-customer@demo.travelos.local \
 *   PORTAL_CUSTOMER_ID=<uuid> \
 *   GATE_TEST_PASSWORD=TravelOS@2026 \
 *   node scripts/provision-portal-test-account.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

const email = process.env.PORTAL_TEST_EMAIL ?? "portal-customer@demo.travelos.local";
const password = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";
const customerId =
  process.env.PORTAL_CUSTOMER_ID ?? "00000000-0005-4000-8000-000000000004";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existingUsers } = await admin.auth.admin.listUsers();
const found = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

let authUserId = found?.id;

if (!authUserId) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: "customer" },
  });
  if (error) {
    console.error("createUser failed:", error.message);
    process.exit(1);
  }
  authUserId = data.user.id;
  console.log("Created auth user:", authUserId);
} else {
  await admin.auth.admin.updateUserById(authUserId, { password });
  console.log("Updated password for existing auth user:", authUserId);
}

const { data: accountId, error: linkError } = await admin.rpc("link_customer_portal_account", {
  p_auth_user_id: authUserId,
  p_customer_id: customerId,
  p_email: email,
});

if (linkError) {
  console.error("link_customer_portal_account failed:", linkError.message);
  process.exit(1);
}

console.log("Portal account linked:", accountId);
console.log(`Ready: PORTAL_TEST_EMAIL=${email} GATE_TEST_PASSWORD=${password}`);
