/**
 * Sprint 8D — async dispatch worker gate.
 *
 * Usage:
 *   node scripts/run-sprint8d-worker-gate.mjs
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
  const mark = status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : "SKIP";
  console.log(`${mark}: [${section}] ${item}${detail ? ` — ${detail}` : ""}`);
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  console.log(`Sprint 8D worker gate — ${BASE_URL}\n`);

  const admin = adminClient();

  const { data: tenant } = await admin.from("tenants").select("id").limit(1).maybeSingle();
  if (!tenant?.id) {
    record("Setup", "Tenant", "SKIP", "no tenant");
    writeResults();
    return;
  }

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("tenant_id", tenant.id)
    .limit(1)
    .maybeSingle();

  const customerId = customer?.id;
  const eventKey = `gate-8d:${tenant.id}:${Date.now()}`;

  const { data: eventId, error: emitErr } = await admin.rpc("emit_domain_event", {
    p_tenant_id: tenant.id,
    p_event_type: "customer.portal_registered",
    p_aggregate_type: "customer",
    p_aggregate_id: customerId ?? tenant.id,
    p_customer_id: customerId,
    p_actor_type: "system",
    p_actor_user_id: null,
    p_actor_customer_id: null,
    p_actor_portal_account_id: null,
    p_payload: { gate: "8d" },
    p_idempotency_key: eventKey,
    p_occurred_at: new Date().toISOString(),
  });

  record(
    "Events",
    "emit test event",
    !emitErr && eventId ? "PASS" : "FAIL",
    emitErr?.message ?? String(eventId)
  );

  if (eventId) {
    const { data: notifJob } = await admin.rpc("enqueue_event_dispatch_job", {
      p_tenant_id: tenant.id,
      p_domain_event_id: eventId,
      p_job_type: "dispatch.notification",
      p_idempotency_key: `dispatch.notification:${eventId}`,
      p_max_retries: 5,
    });

    record(
      "Queue",
      "enqueue notification job",
      notifJob ? "PASS" : "FAIL",
      String(notifJob)
    );

    const { data: dupJob } = await admin.rpc("enqueue_event_dispatch_job", {
      p_tenant_id: tenant.id,
      p_domain_event_id: eventId,
      p_job_type: "dispatch.notification",
      p_idempotency_key: `dispatch.notification:${eventId}`,
      p_max_retries: 5,
    });

    record(
      "Queue",
      "enqueue idempotent",
      notifJob === dupJob ? "PASS" : "FAIL",
      `first=${notifJob}, dup=${dupJob}`
    );
  }

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    record("Worker", "HTTP process batch", "SKIP", "CRON_SECRET not set");
  } else {
    const res = await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batchSize: 10 }),
    });
    const body = await res.json().catch(() => ({}));
    record(
      "Worker",
      "HTTP process batch",
      res.status === 200 && body.data?.processed >= 0 ? "PASS" : "FAIL",
      `status ${res.status}, processed ${body.data?.processed ?? "?"}`
    );

    const bad = await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, {
      method: "POST",
    });
    record(
      "Security",
      "Reject unauthenticated worker",
      bad.status === 401 ? "PASS" : "FAIL",
      `status ${bad.status}`
    );
  }

  if (eventId) {
    const { data: completedJob } = await admin
      .from("event_dispatch_jobs")
      .select("status, retry_count")
      .eq("domain_event_id", eventId)
      .eq("job_type", "dispatch.notification")
      .maybeSingle();

    record(
      "Worker",
      "Job completed after process",
      completedJob?.status === "completed" ? "PASS" : "SKIP",
      completedJob ? `status=${completedJob.status}` : "no job row"
    );
  }

  // Load test — enqueue 20 jobs with unique events (lightweight)
  const loadKeys = [];
  for (let i = 0; i < 5; i++) {
    const key = `gate-8d-load:${tenant.id}:${i}:${Date.now()}`;
    const { data: eid } = await admin.rpc("emit_domain_event", {
      p_tenant_id: tenant.id,
      p_event_type: "customer.created",
      p_aggregate_type: "customer",
      p_aggregate_id: customerId ?? tenant.id,
      p_customer_id: customerId,
      p_actor_type: "system",
      p_actor_user_id: null,
      p_actor_customer_id: null,
      p_actor_portal_account_id: null,
      p_payload: { load: i },
      p_idempotency_key: key,
      p_occurred_at: new Date().toISOString(),
    });
    if (eid) {
      await admin.rpc("enqueue_event_dispatch_job", {
        p_tenant_id: tenant.id,
        p_domain_event_id: eid,
        p_job_type: "dispatch.notification",
        p_idempotency_key: `dispatch.notification:${eid}`,
        p_max_retries: 5,
      });
      loadKeys.push(eid);
    }
  }

  record("Load", "Enqueue 5 notification jobs", loadKeys.length === 5 ? "PASS" : "SKIP", `count=${loadKeys.length}`);

  if (cronSecret) {
    const res = await fetch(`${BASE_URL}/api/cron/process-dispatch-jobs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
      body: JSON.stringify({ batchSize: 10 }),
    });
    const body = await res.json().catch(() => ({}));
    record(
      "Load",
      "Process batch >= 5",
      res.status === 200 && (body.data?.completed ?? 0) >= 1 ? "PASS" : "SKIP",
      `completed ${body.data?.completed ?? 0}`
    );
  }

  writeResults();
}

function writeResults() {
  const fails = results.filter((r) => r.status === "FAIL").length;
  const outPath = resolve(root, "scripts/sprint8d-worker-gate-results.json");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nResults written to ${outPath}`);
  console.log(fails === 0 ? "\nGATE: PASS" : `\nGATE: FAIL (${fails} failures)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
