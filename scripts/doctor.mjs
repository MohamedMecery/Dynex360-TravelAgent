/**
 * Quick environment check for local development.
 * Usage: node scripts/doctor.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let value = t.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log("TravelOS doctor\n");

if (!url || !publicKey) {
  console.log(
    "FAIL: Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or ANON_KEY) in .env.local"
  );
  process.exit(1);
}

const isLocal = url.includes("127.0.0.1") || url.includes("localhost");
console.log(`Supabase host: ${new URL(url).host}${isLocal ? " (local)" : " (cloud)"}`);
console.log(`Service role: ${service ? "set" : "missing (needed for npm run admin:create)"}`);

try {
  const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
    headers: { apikey: publicKey },
  });
  if (!res.ok) {
    console.log(`FAIL: Supabase HTTP ${res.status}`);
    process.exit(1);
  }

  console.log("OK: Supabase is reachable");

  const base = url.replace(/\/$/, "");
  const tenantsRes = await fetch(`${base}/rest/v1/tenants?select=id&limit=1`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
  });

  if (tenantsRes.status === 404) {
    console.log("WARN: Database schema not applied (table public.tenants missing)");
    console.log("  → Run: npm run db:bundle");
    console.log(
      "  → Paste database/scripts/RUN_IN_SUPABASE_SQL_EDITOR.sql in Supabase SQL Editor"
    );
    console.log("  → Or: npx supabase login && npx supabase link --project-ref ndomcfohwnvbyufnrxek && npm run db:push");
    process.exit(2);
  }

  if (!tenantsRes.ok) {
    console.log(`WARN: Could not verify schema (tenants HTTP ${tenantsRes.status})`);
    process.exit(0);
  }

  console.log("OK: Core schema present (tenants table)");
  process.exit(0);
} catch {
  console.log("FAIL: Cannot connect to Supabase");
  if (isLocal) {
    console.log("  → Install/start Docker Desktop, then: npx supabase start");
    console.log("  → Or switch .env.local to a Supabase Cloud project URL");
  } else {
    console.log("  → Verify cloud project URL and keys in Supabase Dashboard → Settings → API");
  }
  process.exit(1);
}
