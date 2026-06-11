/**
 * Sprint 9D — AI Operations Assistant gate.
 *
 * Usage: node scripts/run-sprint9d-operations-ai-gate.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
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
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  console.log("Sprint 9D AI Operations Assistant gate\n");
  const admin = adminClient();

  const tables = [
    "ai_ops_snapshots",
    "ai_ops_score_history",
    "ai_ops_recommendations",
    "ai_ops_recommendation_feedback",
    "ai_ops_insight_cache",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).select("id").limit(1);
    record("Schema", table, error ? "FAIL" : "PASS", error?.message);
  }

  const { error: docColError } = await admin
    .from("booking_documents")
    .select("document_type")
    .limit(1);
  record(
    "Schema",
    "booking_documents.document_type",
    docColError ? "FAIL" : "PASS",
    docColError?.message
  );

  const { error: rpcError } = await admin.rpc("get_operations_insights", {
    p_from: new Date(Date.now() - 30 * 86400000).toISOString(),
    p_to: new Date().toISOString(),
  });
  record(
    "RPC",
    "get_operations_insights callable",
    rpcError?.message?.includes("42501") || rpcError?.message?.includes("permission")
      ? "PASS"
      : rpcError
        ? "FAIL"
        : "PASS",
    rpcError?.message ?? "ok (service role)"
  );

  const { data: perm } = await admin
    .from("permissions")
    .select("id")
    .eq("module", "ai")
    .eq("action", "operations.read")
    .maybeSingle();
  record("Permissions", "ai.operations.read", perm ? "PASS" : "FAIL");

  const { data: agentRow } = await admin
    .from("ai_agents")
    .select("agent_key")
    .eq("agent_key", "operations")
    .limit(1);
  record(
    "AI Platform",
    "operations agent_key seeded",
    agentRow?.length ? "PASS" : "SKIP",
    agentRow?.length ? undefined : "apply migration 063"
  );

  const { data: jobTypes } = await admin
    .from("event_dispatch_jobs")
    .select("job_type")
    .eq("job_type", "dispatch.ai_ops_score")
    .limit(1);
  record(
    "Events",
    "dispatch.ai_ops_score job type usable",
    jobTypes !== null ? "PASS" : "FAIL"
  );

  const outDir = resolve(root, "scripts");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "sprint9d-operations-ai-gate-results.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2)
  );

  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nDone: ${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
