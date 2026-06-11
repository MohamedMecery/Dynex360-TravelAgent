/**
 * Apply migration 034 to staging when `supabase db push` history is out of sync.
 * Uses Supabase Management API via service role + PostgREST is not suitable for DDL;
 * run the SQL file in Supabase SQL Editor, or use: npx supabase db execute -f ...
 *
 * This script verifies whether crm_dashboard_stats exists after manual apply.
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error } = await supabase.rpc("crm_dashboard_stats", {
  p_from: new Date(Date.now() - 86400000 * 30).toISOString(),
  p_to: new Date().toISOString(),
  p_include_financial: false,
});

if (error?.message?.includes("Could not find the function")) {
  console.error(
    "crm_dashboard_stats is NOT on staging. Apply database/migrations/034_crm_dashboard_rpc.sql in Supabase SQL Editor (or fix migration history and npm run db:push)."
  );
  process.exit(1);
}

if (error && /dashboard permission|tenant context/i.test(error.message)) {
  console.log("PASS: crm_dashboard_stats exists (permission guard without user JWT)");
  process.exit(0);
}

if (error) {
  console.error("RPC error:", error.message);
  process.exit(1);
}

console.log("PASS: crm_dashboard_stats returned data");
process.exit(0);
