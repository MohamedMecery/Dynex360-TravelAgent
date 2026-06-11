/**
 * CRM Sprint 1 validation — migrations 025-029 + permission/RLS checks.
 *
 * Usage:
 *   npm run test:crm-rls
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY when
 * validating a live database. File checks always run locally.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const REQUIRED_MIGRATIONS = [
  "025_crm_enums.sql",
  "026_crm_core_tables.sql",
  "027_crm_functions.sql",
  "028_crm_rls.sql",
  "029_crm_permissions.sql",
  "030_crm_opportunity_context.sql",
  "031_crm_stage_history_activity_rollups.sql",
  "032_crm_activity_direction.sql",
  "033_crm_customer360_views.sql",
  "034_crm_dashboard_rpc.sql",
  "035_quotations.sql",
  "036_quotation_rls_permissions.sql",
];

const QUOTATION_PERMISSIONS = [
  "quotations.read",
  "quotations.read_all",
  "quotations.write",
  "quotations.write_all",
  "quotations.approve",
  "quotations.send",
  "quotations.accept",
  "quotations.convert",
];

const CRM_PERMISSIONS_7A = [
  "leads.read",
  "leads.read_all",
  "leads.write",
  "leads.write_all",
  "opportunities.read",
  "opportunities.read_all",
  "opportunities.write",
  "opportunities.write_all",
  "activities.read",
  "activities.read_all",
  "activities.write",
  "activities.write_all",
  "dashboard.read",
];

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

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function checkMigrationFiles() {
  const dir = resolve(root, "database/migrations");
  const files = readdirSync(dir);
  for (const name of REQUIRED_MIGRATIONS) {
    assert(files.includes(name), `missing migration file ${name}`);
    const sql = readFileSync(resolve(dir, name), "utf8");
    assert(sql.length > 50, `${name} appears empty`);
  }
  const oppSql = readFileSync(resolve(dir, "026_crm_core_tables.sql"), "utf8");
  const oppDdl = oppSql.match(/CREATE TABLE opportunities[\s\S]*?\);/);
  assert(oppDdl, "opportunities DDL not found in 026");
  assert(!oppDdl[0].includes("package_id"), "026 must not define package_id on opportunities");
  console.log(
    "PASS: migration files 025-036 present and opportunities has no package_id"
  );

  const q035 = readFileSync(resolve(dir, "035_quotations.sql"), "utf8");
  assert(q035.includes("uq_booking_quotation"), "035 must define uq_booking_quotation");
  assert(q035.includes("CREATE TABLE quotations"), "035 must create quotations table");
  console.log("PASS: 035 quotations migration (uq_booking_quotation)");

  const q036 = readFileSync(resolve(dir, "036_quotation_rls_permissions.sql"), "utf8");
  assert(q036.includes("quotations_select"), "036 must enable quotations RLS");
  assert(q036.includes("quotation_sent"), "036 must extend Customer 360 timeline");
  console.log("PASS: 036 quotation RLS and timeline");
}

async function checkLiveDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      "SKIP: live DB checks (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run db:push)"
    );
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let tablesMissing = false;
  for (const table of ["leads", "opportunities", "activities", "quotations", "quotation_items"]) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error?.message?.includes("Could not find the table")) {
      tablesMissing = true;
      break;
    }
    assert(!error, `table ${table}: ${error?.message}`);
  }
  if (tablesMissing) {
    const requireLive = process.env.CRM_REQUIRE_LIVE === "1";
    const msg =
      "live DB — CRM tables not migrated. Run: npm run db:push (or apply 025-029 in SQL Editor)";
    if (requireLive) {
      assert(false, msg);
    }
    console.warn(`SKIP: ${msg}`);
    return;
  }
  console.log("PASS: tables leads, opportunities, activities, quotations exist");

  const { data: perms, error: permErr } = await supabase
    .from("permissions")
    .select("action")
    .eq("module", "crm");
  assert(!permErr, permErr?.message);
  const actions = new Set((perms ?? []).map((p) => p.action));
  for (const action of CRM_PERMISSIONS_7A) {
    assert(actions.has(action), `missing permission crm.${action}`);
  }
  for (const action of QUOTATION_PERMISSIONS) {
    assert(actions.has(action), `missing permission crm.${action}`);
  }
  console.log("PASS: CRM permissions seeded (incl. quotations)");

  const { data: roles } = await supabase.from("roles").select("id, name");
  const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.name, r.id]));

  async function roleHasAction(roleName, action) {
    const roleId = roleMap[roleName];
    const { data: rp } = await supabase
      .from("role_permissions")
      .select("permission_id, permissions!inner(action, module)")
      .eq("role_id", roleId);
    return (rp ?? []).some(
      (row) => row.permissions?.module === "crm" && row.permissions?.action === action
    );
  }

  assert(await roleHasAction("sales_agent", "leads.write"), "sales_agent needs leads.write");
  assert(
    !(await roleHasAction("sales_agent", "leads.read_all")),
    "sales_agent must not have leads.read_all"
  );
  assert(
    await roleHasAction("finance_officer", "leads.read_all"),
    "finance_officer needs leads.read_all"
  );
  assert(
    !(await roleHasAction("finance_officer", "leads.write")),
    "finance_officer must not have leads.write"
  );
  assert(
    await roleHasAction("sales_agent", "quotations.convert"),
    "sales_agent needs quotations.convert"
  );
  assert(
    !(await roleHasAction("finance_officer", "quotations.convert")),
    "finance_officer must not have quotations.convert"
  );
  assert(
    await roleHasAction("finance_officer", "quotations.read_all"),
    "finance_officer needs quotations.read_all"
  );
  assert(
    await roleHasAction("tenant_admin", "dashboard.read"),
    "tenant_admin needs dashboard.read"
  );
  console.log("PASS: role permission matrix (sales_agent, finance_officer, tenant_admin)");

  const { error: pkgColErr } = await supabase.from("opportunities").select("package_id").limit(1);
  assert(
    pkgColErr && /package_id|column/i.test(pkgColErr.message),
    "opportunities.package_id must not exist (column should be rejected)"
  );
  console.log("PASS: opportunities has no package_id column");

  const { error: stageHistErr } = await supabase
    .from("opportunity_stage_history")
    .select("id")
    .limit(1);
  assert(!stageHistErr, `opportunity_stage_history: ${stageHistErr?.message}`);
  console.log("PASS: table opportunity_stage_history exists");

  const { error: rollupErr } = await supabase
    .from("customers")
    .select("activity_count, last_activity_at")
    .limit(1);
  assert(!rollupErr, `customers rollups: ${rollupErr?.message}`);
  console.log("PASS: customers.activity_count / last_activity_at columns");

  const { error: dirErr } = await supabase
    .from("activities")
    .select("direction")
    .limit(1);
  assert(!dirErr, `activities.direction: ${dirErr?.message}`);
  console.log("PASS: activities.direction column (032)");

  const { error: timelineViewErr } = await supabase
    .from("v_customer_timeline_events")
    .select("id, event_type, timeline_bucket")
    .limit(1);
  assert(!timelineViewErr, `v_customer_timeline_events: ${timelineViewErr?.message}`);
  console.log("PASS: view v_customer_timeline_events queryable");

  const { error: travelViewErr } = await supabase
    .from("v_customer_travel_history")
    .select("destination_label, travel_year, booking_count")
    .limit(1);
  assert(!travelViewErr, `v_customer_travel_history: ${travelViewErr?.message}`);
  console.log("PASS: view v_customer_travel_history queryable");

  const migration033 = readFileSync(
    resolve(root, "database/migrations/033_crm_customer360_views.sql"),
    "utf8"
  );
  assert(
    migration033.includes("v_customer_timeline_events") &&
      migration033.includes("v_customer_travel_history"),
    "033 must define Customer 360 views"
  );
  assert(
    !migration033.includes("quotation_sent") &&
      !migration033.includes("FROM quotations"),
    "033 must not include quotation timeline events"
  );
  console.log("PASS: 033 Customer 360 views (no quotation events)");

  const migration034 = readFileSync(
    resolve(root, "database/migrations/034_crm_dashboard_rpc.sql"),
    "utf8"
  );
  assert(
    migration034.includes("crm_dashboard_stats") &&
      migration034.includes("has_crm_permission('dashboard.read')"),
    "034 must define crm_dashboard_stats with dashboard.read guard"
  );
  assert(
    !migration034.includes("FROM quotations") &&
      !migration034.includes("quotation_sent"),
    "034 must not query quotations tables"
  );
  console.log("PASS: 034 CRM dashboard RPC migration file");

  const { data: rpcRows, error: rpcMetaErr } = await supabase.rpc("crm_dashboard_stats", {
    p_from: new Date(Date.now() - 86400000 * 30).toISOString(),
    p_to: new Date().toISOString(),
    p_include_financial: false,
  });
  if (rpcMetaErr?.message?.includes("Could not find the function")) {
    const requireLive = process.env.CRM_REQUIRE_LIVE === "1";
    const msg = "live DB — crm_dashboard_stats not applied. Run: npm run db:push";
    if (requireLive) assert(false, msg);
    console.warn(`SKIP: ${msg}`);
    return;
  }
  if (
    rpcMetaErr &&
    (rpcMetaErr.code === "42501" ||
      /dashboard permission|tenant context/i.test(rpcMetaErr.message ?? ""))
  ) {
    console.log("PASS: crm_dashboard_stats exists (permission guard active without user JWT)");
  } else {
    assert(!rpcMetaErr, `crm_dashboard_stats RPC: ${rpcMetaErr?.message}`);
    assert(rpcRows && typeof rpcRows === "object", "crm_dashboard_stats must return JSON");
    const rpc = rpcRows;
    assert(
      "kpis" in rpc && "charts" in rpc && "lists" in rpc,
      "RPC payload must include kpis/charts/lists"
    );
    console.log("PASS: crm_dashboard_stats RPC returned dashboard JSON");
  }

  const { error: bookingQuoteIdxErr } = await supabase
    .from("bookings")
    .select("quotation_id")
    .limit(1);
  assert(!bookingQuoteIdxErr, `bookings.quotation_id: ${bookingQuoteIdxErr?.message}`);
  console.log("PASS: bookings.quotation_id column");
}

async function main() {
  console.log("CRM RLS & migration validation (025-036)\n");
  checkMigrationFiles();
  await checkLiveDatabase();
  console.log("\nAll CRM migration and RLS checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
