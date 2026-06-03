/**
 * CI-only prep: verify secrets, sync E2E admin, seed demo data (DEMO-BK-005, knowledge docs).
 *
 * Usage (GitHub Actions sets env from secrets):
 *   node scripts/e2e-ci-prep.mjs
 */

import { execSync } from "node:child_process";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
];

const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!publicKey) {
  required.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const missing = required.filter((key) => {
  if (key.includes(" or ")) return !publicKey;
  return !process.env[key]?.trim();
});

if (missing.length) {
  console.error("[e2e-ci-prep] Missing required environment variables:");
  for (const key of missing) console.error(`  - ${key}`);
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publicKey;
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = publicKey;
}

process.env.ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL.trim().toLowerCase();
process.env.ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

console.log("[e2e-ci-prep] Provisioning admin:", process.env.ADMIN_EMAIL);
execSync("node scripts/create-admin-user.mjs", { stdio: "inherit", env: process.env });

console.log("[e2e-ci-prep] Seeding demo data…");
execSync("node scripts/seed-demo-data.mjs", { stdio: "inherit", env: process.env });

console.log("[e2e-ci-prep] Done.");
