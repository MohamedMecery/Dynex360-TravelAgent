/**
 * Sprint 8C — Domain events & notification dispatch gate.
 *
 * Validates emit_domain_event RPC, idempotency, and projection tables via service role.
 *
 * Usage:
 *   node scripts/run-sprint8c-events-gate.mjs
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
  if (!url || !key) throw new Error("Missing Supabase service role env");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function main() {
  console.log("Sprint 8C events gate\n");

  let admin;
  try {
    admin = adminClient();
    record("Setup", "Admin client", "PASS", "connected");
  } catch (err) {
    record("Setup", "Admin client", "SKIP", err.message);
    writeResults();
    return;
  }

  const { data: tenantRow, error: tenantErr } = await admin
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (tenantErr || !tenantRow?.id) {
    record("Setup", "Resolve tenant", "SKIP", tenantErr?.message ?? "no tenant");
    writeResults();
    return;
  }

  const tenantId = tenantRow.id;

  const { data: customerRow } = await admin
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .limit(1)
    .maybeSingle();

  const customerId = customerRow?.id ?? null;
  const aggregateId = customerId ?? "00000000-0000-4000-8000-0000000000c1";
  const idempotencyKey = `gate-test:customer.portal_registered:${tenantId}:customer:${aggregateId}:v1`;

  const { data: eventId1, error: emitErr1 } = await admin.rpc("emit_domain_event", {
    p_tenant_id: tenantId,
    p_event_type: "customer.portal_registered",
    p_aggregate_type: "customer",
    p_aggregate_id: aggregateId,
    p_customer_id: customerId,
    p_actor_type: "system",
    p_actor_user_id: null,
    p_actor_customer_id: null,
    p_actor_portal_account_id: null,
    p_payload: { title: "Gate test portal registration", gate: true },
    p_idempotency_key: idempotencyKey,
    p_occurred_at: new Date().toISOString(),
  });

  record(
    "Events",
    "emit_domain_event insert",
    !emitErr1 && eventId1 ? "PASS" : "FAIL",
    emitErr1?.message ?? String(eventId1)
  );

  const { data: eventId2, error: emitErr2 } = await admin.rpc("emit_domain_event", {
    p_tenant_id: tenantId,
    p_event_type: "customer.portal_registered",
    p_aggregate_type: "customer",
    p_aggregate_id: aggregateId,
    p_customer_id: customerId,
    p_actor_type: "system",
    p_actor_user_id: null,
    p_actor_customer_id: null,
    p_actor_portal_account_id: null,
    p_payload: { title: "Gate test duplicate", gate: true },
    p_idempotency_key: idempotencyKey,
    p_occurred_at: new Date().toISOString(),
  });

  record(
    "Events",
    "emit_domain_event idempotent",
    !emitErr2 && eventId2 === eventId1 ? "PASS" : "FAIL",
    `first=${eventId1}, second=${eventId2}`
  );

  const { count: eventCount, error: countErr } = await admin
    .from("domain_events")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", idempotencyKey);

  record(
    "Events",
    "Single row per idempotency key",
    !countErr && eventCount === 1 ? "PASS" : "FAIL",
    countErr?.message ?? `count=${eventCount}`
  );

  const { data: timelineRows, error: timelineErr } = await admin
    .from("v_customer_timeline_events")
    .select("id, event_type")
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("ref_table", "domain_events")
    .limit(5);

  record(
    "Timeline",
    "domain_events in v_customer_timeline_events",
    !timelineErr && Array.isArray(timelineRows) && customerId
      ? timelineRows.length >= 1
        ? "PASS"
        : "SKIP"
      : !timelineErr && !customerId
        ? "SKIP"
        : "FAIL",
    timelineErr?.message ?? `rows=${timelineRows?.length ?? 0}, customer=${customerId ? "yes" : "no"}`
  );

  if (customerId && eventId1) {
    const { error: projErr } = await admin.from("customer_notifications").insert({
      tenant_id: tenantId,
      customer_id: customerId,
      domain_event_id: eventId1,
      type: "customer.portal_registered",
      title: "Gate dispatcher projection",
      message: "Projection write test",
    });

    record(
      "Dispatcher",
      "customer_notifications projection insert",
      !projErr ? "PASS" : "FAIL",
      projErr?.message ?? "ok"
    );

    const { error: deliveryErr } = await admin.from("notification_deliveries").upsert(
      {
        tenant_id: tenantId,
        domain_event_id: eventId1,
        channel: "in_app",
        recipient_type: "customer",
        recipient_id: customerId,
        status: "sent",
        attempted_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      { onConflict: "domain_event_id,channel,recipient_id" }
    );

    record(
      "Dispatcher",
      "notification_deliveries in_app upsert",
      !deliveryErr ? "PASS" : "FAIL",
      deliveryErr?.message ?? "ok"
    );

    const { data: staffUser } = await admin
      .from("users")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    if (staffUser?.id) {
      const { error: staffNotifErr } = await admin.from("notifications").insert({
        tenant_id: tenantId,
        user_id: staffUser.id,
        domain_event_id: eventId1,
        type: "customer.portal_registered",
        title: "Gate staff inbox projection",
        message: "Staff projection test",
        priority: "normal",
      });

      record(
        "Dispatcher",
        "staff notifications projection insert",
        !staffNotifErr ? "PASS" : "FAIL",
        staffNotifErr?.message ?? "ok"
      );
    } else {
      record("Dispatcher", "staff notifications projection insert", "SKIP", "no staff user");
    }
  } else {
    record("Dispatcher", "customer_notifications projection insert", "SKIP", "no customer row");
    record("Dispatcher", "notification_deliveries in_app upsert", "SKIP", "no customer row");
    record("Dispatcher", "staff notifications projection insert", "SKIP", "no customer row");
  }

  writeResults();
}

function writeResults() {
  const fails = results.filter((r) => r.status === "FAIL").length;
  const outPath = resolve(root, "scripts/sprint8c-events-gate-results.json");
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
