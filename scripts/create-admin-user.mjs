/**
 * Creates a Supabase Auth user and provisions tenant_admin in public schema.
 *
 * Usage:
 *   node scripts/create-admin-user.mjs
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Secret1!' node scripts/create-admin-user.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
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
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "eng.m.mecery@gmail.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "TravelOS@2026";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Eng Admin";
const TENANT_NAME = process.env.TENANT_NAME ?? "Dynex360 Travel";
const TENANT_SLUG = process.env.TENANT_SLUG ?? "dynex360-travel";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
}

async function ensureAuthUser() {
  let user = await findAuthUserByEmail(ADMIN_EMAIL);

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Updated existing auth user: ${ADMIN_EMAIL} (${user.id})`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME },
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created auth user: ${ADMIN_EMAIL} (${user.id})`);
  }

  return user;
}

async function provisionTenant(userId) {
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, tenant_id")
    .eq("id", userId)
    .maybeSingle();

  let tenantId = existingUser?.tenant_id ?? null;

  if (!tenantId) {
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", TENANT_SLUG)
      .maybeSingle();

    if (existingTenant?.id) {
      tenantId = existingTenant.id;
      console.log(`Using existing tenant slug=${TENANT_SLUG} (${tenantId})`);
    } else {
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({ name: TENANT_NAME, slug: TENANT_SLUG, status: "active" })
        .select("id")
        .single();
      if (tenantError) throw tenantError;
      tenantId = tenant.id;
      console.log(`Created tenant: ${TENANT_NAME} (${tenantId})`);

      const { error: settingsError } = await supabase.from("tenant_settings").insert({
        tenant_id: tenantId,
        default_currency: "USD",
        timezone: "UTC",
        locale: "en",
      });
      if (settingsError && settingsError.code !== "23505") throw settingsError;
    }
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: userId,
      tenant_id: tenantId,
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      status: "active",
    },
    { onConflict: "id" }
  );
  if (profileError) throw profileError;

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "tenant_admin")
    .single();
  if (roleError) throw roleError;

  const { error: userRoleError } = await supabase.from("user_roles").upsert(
    { user_id: userId, role_id: role.id, tenant_id: tenantId },
    { onConflict: "user_id,tenant_id" }
  );
  if (userRoleError) throw userRoleError;

  console.log(`Provisioned tenant_admin for ${ADMIN_EMAIL} on tenant ${tenantId}`);
  return tenantId;
}

async function main() {
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Admin email: ${ADMIN_EMAIL}`);

  const user = await ensureAuthUser();
  await provisionTenant(user.id);

  console.log("\n--- Login credentials ---");
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log("\nSign in at /login then open /dashboard.");
  console.log("Enable Custom Access Token Hook (migration 009) in Supabase Dashboard for JWT tenant_id + role.");
}

main().catch((err) => {
  const message = err.message ?? String(err);
  console.error(message);
  if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
    console.error("\nSupabase is not reachable. Start local: npx supabase start");
    console.error("Or set cloud NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  process.exit(1);
});
