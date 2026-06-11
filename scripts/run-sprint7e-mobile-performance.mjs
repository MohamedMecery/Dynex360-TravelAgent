/**
 * Sprint 7E — Mobile API performance sampling (Bearer auth).
 *
 * Usage:
 *   GATE_BASE_URL=http://localhost:3000 node scripts/run-sprint7e-mobile-performance.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BASE_URL = (process.env.GATE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";
const EMAIL = process.env.GATE_SALES_EMAIL ?? "wp3a-sales@demo.travelos.local";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function getBearer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (error) throw error;
  return data.session.access_token;
}

async function timedFetch(bearer, path) {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
  });
  await res.json().catch(() => ({}));
  return { path, ms: Math.round(performance.now() - start), status: res.status };
}

const ENDPOINTS = [
  "/api/auth/me?include_permissions=true",
  "/api/crm/dashboard?period=month",
  "/api/leads?limit=20&page=1",
  "/api/opportunities?limit=20&page=1",
  "/api/quotations?limit=20&page=1",
  "/api/quotations?search=QT&limit=20",
  "/api/bookings?limit=20&page=1",
];

async function main() {
  const bearer = await getBearer();
  const samples = [];
  for (const path of ENDPOINTS) {
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await timedFetch(bearer, path));
    const avg = Math.round(runs.reduce((s, r) => s + r.ms, 0) / runs.length);
    samples.push({ path, avgMs: avg, status: runs[0].status });
    console.log(`${path}: ${avg}ms avg`);
  }
  const out = resolve(root, "scripts/sprint7e-mobile-performance.json");
  writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), samples }, null, 2));
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
