/**
 * Event dispatch worker health verification (Sprint 9E).
 *
 * Validates queue depth, failed/dead-letter jobs, and dispatch latency.
 *
 * Usage:
 *   node scripts/verify-worker-health.mjs
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
const PENDING_WARN = Number(process.env.WORKER_PENDING_WARN ?? "50");
const PENDING_FAIL = Number(process.env.WORKER_PENDING_FAIL ?? "200");
const LATENCY_WARN_MS = Number(process.env.WORKER_LATENCY_WARN_MS ?? "300000");

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
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "WARN";
  console.log(`${mark}: [${section}] ${item}${detail ? ` — ${detail}` : ""}`);
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function countByStatus(admin, status) {
  const { count, error } = await admin
    .from("event_dispatch_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  console.log(`Worker health verification — ${BASE_URL}\n`);
  const admin = adminClient();

  const pending = await countByStatus(admin, "pending");
  const processing = await countByStatus(admin, "processing");
  const failed = await countByStatus(admin, "failed");
  const deadLetter = await countByStatus(admin, "dead_letter");

  record(
    "Queue",
    "pending jobs",
    pending >= PENDING_FAIL ? "FAIL" : pending >= PENDING_WARN ? "WARN" : "PASS",
    String(pending)
  );
  record("Queue", "processing jobs", processing > 10 ? "WARN" : "PASS", String(processing));
  record("Queue", "failed jobs", failed > 0 ? "WARN" : "PASS", String(failed));
  record(
    "Queue",
    "dead_letter jobs",
    deadLetter > 0 ? "FAIL" : "PASS",
    deadLetter > 0 ? "requires manual replay or fix" : "0"
  );

  const { data: oldestPending } = await admin
    .from("event_dispatch_jobs")
    .select("created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (oldestPending?.created_at) {
    const ageMs = Date.now() - new Date(oldestPending.created_at).getTime();
    record(
      "Latency",
      "oldest pending age",
      ageMs > LATENCY_WARN_MS ? "WARN" : "PASS",
      `${Math.round(ageMs / 1000)}s`
    );
  } else {
    record("Latency", "oldest pending age", "PASS", "no pending jobs");
  }

  const { data: recentCompleted } = await admin
    .from("event_dispatch_jobs")
    .select("started_at, completed_at")
    .eq("status", "completed")
    .not("started_at", "is", null)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (recentCompleted?.length) {
    const durations = recentCompleted
      .map((j) => new Date(j.completed_at).getTime() - new Date(j.started_at).getTime())
      .filter((n) => n >= 0);
    const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] ?? 0;
    record(
      "Latency",
      "p95 job duration (sample)",
      p95 > 60000 ? "WARN" : "PASS",
      `${p95}ms over ${durations.length} jobs`
    );
  } else {
    record("Latency", "p95 job duration (sample)", "WARN", "no recent completed jobs");
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    record("Worker", "cron endpoint reachable", "WARN", "CRON_SECRET not set");
  } else {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchSize: 5 }),
    });
    const body = await res.json().catch(() => ({}));
    const ms = Date.now() - start;
    record(
      "Worker",
      "cron process batch",
      res.status === 200 ? "PASS" : "FAIL",
      `status ${res.status}, ${ms}ms, processed ${body.data?.processed ?? "?"}`
    );
    record(
      "Security",
      "cron rejects missing secret",
      (await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, { method: "POST" })).status === 401
        ? "PASS"
        : "FAIL"
    );
  }

  const outPath = resolve(root, "scripts/worker-health-results.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const fails = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nResults: ${outPath}`);
  console.log(fails === 0 ? "WORKER HEALTH: PASS" : `WORKER HEALTH: FAIL (${fails})`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
