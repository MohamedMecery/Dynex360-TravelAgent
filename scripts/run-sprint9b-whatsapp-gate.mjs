/**
 * Sprint 9B — WhatsApp communications gate.
 *
 * Requires migrations 051–055 and WHATSAPP_MOCK_MODE=true (default when no token).
 *
 * Usage: node scripts/run-sprint9b-whatsapp-gate.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const results = [];

process.env.WHATSAPP_MOCK_MODE = process.env.WHATSAPP_MOCK_MODE ?? "true";

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
  console.log("Sprint 9B WhatsApp gate\n");
  const admin = adminClient();

  const tables = [
    "whatsapp_templates",
    "whatsapp_messages",
    "customer_communication_preferences",
    "tenant_whatsapp_settings",
  ];

  for (const table of tables) {
    const { error } = await admin.from(table).select("id").limit(1);
    record("Schema", table, error ? "FAIL" : "PASS", error?.message);
  }

  const { data: enumCheck } = await admin
    .from("notification_deliveries")
    .select("id")
    .eq("channel", "whatsapp")
    .limit(1);
  record(
    "Schema",
    "notification_deliveries.channel whatsapp",
    enumCheck !== null ? "PASS" : "FAIL"
  );

  const { data: tenant } = await admin.from("tenants").select("id").limit(1).maybeSingle();
  if (!tenant?.id) {
    record("Setup", "tenant", "SKIP", "no tenant");
    writeResults();
    return;
  }

  await admin
    .from("tenant_whatsapp_settings")
    .upsert({ tenant_id: tenant.id, whatsapp_enabled: true }, { onConflict: "tenant_id" });

  const { data: customer } = await admin
    .from("customers")
    .select("id, mobile")
    .eq("tenant_id", tenant.id)
    .limit(1)
    .maybeSingle();

  if (!customer?.id) {
    record("Setup", "customer", "SKIP", "no customer");
    writeResults();
    return;
  }

  await admin.from("customers").update({ mobile: "01009998877" }).eq("id", customer.id);

  await admin.from("customer_communication_preferences").upsert(
    {
      tenant_id: tenant.id,
      customer_id: customer.id,
      preferred_language: "en",
      whatsapp_opt_in_at: new Date().toISOString(),
      whatsapp_opt_out_at: null,
    },
    { onConflict: "tenant_id,customer_id" }
  );

  const templateName = `gate_quotation_sent_en_${Date.now()}`;
  const { data: template, error: tplErr } = await admin
    .from("whatsapp_templates")
    .insert({
      tenant_id: tenant.id,
      internal_name: templateName,
      meta_template_name: "quotation_sent_en",
      language: "en",
      meta_status: "approved",
      event_type: "quotation.sent",
      variable_count: 2,
      body_preview: "Hello {{1}}, quotation {{2}}",
    })
    .select("id")
    .single();

  record("Templates", "seed approved template", !tplErr && template?.id ? "PASS" : "FAIL");

  const eventKey = `gate-9b:${tenant.id}:${Date.now()}`;
  const { data: eventId, error: emitErr } = await admin.rpc("emit_domain_event", {
    p_tenant_id: tenant.id,
    p_event_type: "quotation.sent",
    p_aggregate_type: "quotation",
    p_aggregate_id: customer.id,
    p_customer_id: customer.id,
    p_actor_type: "system",
    p_actor_user_id: null,
    p_actor_customer_id: null,
    p_actor_portal_account_id: null,
    p_payload: {
      quotation_number: "Q-GATE-9B",
      customer_name: "Gate Customer",
    },
    p_idempotency_key: eventKey,
    p_occurred_at: new Date().toISOString(),
  });

  record("Events", "emit quotation.sent", !emitErr && eventId ? "PASS" : "FAIL", emitErr?.message);

  const { data: waJobId } = await admin.rpc("enqueue_event_dispatch_job", {
    p_tenant_id: tenant.id,
    p_domain_event_id: eventId,
    p_job_type: "dispatch.whatsapp",
    p_idempotency_key: `dispatch.whatsapp:${eventId}`,
  });

  record("Queue", "enqueue dispatch.whatsapp", waJobId ? "PASS" : "FAIL");

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const base = (process.env.GATE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const res = await fetch(`${base}/api/cron/process-dispatch-jobs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    record(
      "Worker",
      "process-dispatch-jobs HTTP",
      res.ok ? "PASS" : "FAIL",
      `${res.status}`
    );
  } else {
    record("Worker", "process-dispatch-jobs HTTP", "SKIP", "CRON_SECRET unset");
  }

  const { data: delivery } = await admin
    .from("notification_deliveries")
    .select("status")
    .eq("domain_event_id", eventId)
    .eq("channel", "whatsapp")
    .maybeSingle();

  record(
    "Delivery",
    "notification_deliveries whatsapp row",
    delivery ? "PASS" : "FAIL",
    delivery?.status
  );

  const { data: dupJob } = await admin.rpc("enqueue_event_dispatch_job", {
    p_tenant_id: tenant.id,
    p_domain_event_id: eventId,
    p_job_type: "dispatch.whatsapp",
    p_idempotency_key: `dispatch.whatsapp:${eventId}`,
  });

  record(
    "Queue",
    "idempotent enqueue",
    dupJob === waJobId ? "PASS" : "FAIL",
    `first=${waJobId} dup=${dupJob}`
  );

  const { data: otherTenant } = await admin
    .from("tenants")
    .select("id")
    .neq("id", tenant.id)
    .limit(1)
    .maybeSingle();

  if (otherTenant?.id) {
    const { count } = await admin
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("customer_id", customer.id);

    const { data: crossRows } = await admin
      .from("whatsapp_messages")
      .select("id")
      .eq("tenant_id", otherTenant.id)
      .eq("customer_id", customer.id)
      .limit(1);

    record(
      "Isolation",
      "cross-tenant message rows",
      !crossRows?.length ? "PASS" : "FAIL",
      `tenant messages: ${count ?? 0}`
    );
  } else {
    record("Isolation", "cross-tenant", "SKIP", "single tenant");
  }

  writeResults();
}

function writeResults() {
  const outDir = resolve(root, "scripts");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "sprint9b-whatsapp-gate-results.json");
  writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nWrote ${outPath}`);
  console.log(failed === 0 ? "Gate PASSED" : `Gate FAILED (${failed} items)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
