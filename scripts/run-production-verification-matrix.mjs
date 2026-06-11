/**
 * Sprint 9E — Production verification matrix.
 * Runs subsystem gate scripts and aggregates PASS/FAIL per subsystem.
 *
 * Usage:
 *   node scripts/run-production-verification-matrix.mjs
 *   GATE_BASE_URL=https://your-pilot.vercel.app node scripts/run-production-verification-matrix.mjs
 */

import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SUBSYSTEMS = [
  { id: "env", label: "Production environment", script: "validate-production-env.mjs", npm: null },
  { id: "worker_health", label: "Worker health", script: "verify-worker-health.mjs", npm: null },
  { id: "foundation", label: "API foundation (7B)", script: null, npm: "gate:sprint7b:foundation" },
  { id: "crm_dashboard", label: "CRM dashboard (6)", script: null, npm: "gate:sprint6:dashboard" },
  { id: "portal", label: "Customer portal (8A–C)", script: null, npm: "gate:portal" },
  { id: "events", label: "Domain events (8C)", script: null, npm: "gate:sprint8c:events" },
  { id: "worker", label: "Dispatch worker (8D)", script: null, npm: "gate:sprint8d:worker" },
  { id: "payments", label: "Payments (9A)", script: null, npm: "gate:sprint9a:payments" },
  { id: "whatsapp", label: "WhatsApp (9B)", script: null, npm: "gate:sprint9b:whatsapp" },
  { id: "sales_ai", label: "Sales AI (9C)", script: null, npm: "gate:sprint9c:sales-ai" },
  { id: "operations_ai", label: "Operations AI (9D)", script: null, npm: "gate:sprint9d:operations-ai" },
  {
    id: "commercial",
    label: "Commercial journey (9E)",
    script: "run-commercial-journey-gate.mjs",
    npm: null,
  },
];

const matrix = [];
const skipGates = process.env.SKIP_GATE_SCRIPTS === "1";

function runNodeScript(scriptName) {
  const scriptPath = resolve(root, "scripts", scriptName);
  if (!existsSync(scriptPath)) {
    return { status: "FAIL", detail: `missing ${scriptName}` };
  }
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
  });
  return {
    status: result.status === 0 ? "PASS" : "FAIL",
    detail: result.status === 0 ? "exit 0" : (result.stderr || result.stdout || "").slice(0, 500),
  };
}

function runNpmScript(name) {
  const result = spawnSync("npm", ["run", name], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    shell: true,
    stdio: "pipe",
  });
  return {
    status: result.status === 0 ? "PASS" : "FAIL",
    detail: result.status === 0 ? "exit 0" : (result.stderr || result.stdout || "").slice(0, 500),
  };
}

console.log("TravelOS production verification matrix\n");
console.log(`Base URL: ${process.env.GATE_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://localhost:3000"}`);
if (skipGates) console.log("SKIP_GATE_SCRIPTS=1 — only env + worker health + commercial\n");

for (const sub of SUBSYSTEMS) {
  if (skipGates && sub.npm) {
    matrix.push({ ...sub, status: "SKIP", detail: "SKIP_GATE_SCRIPTS" });
    console.log(`SKIP: ${sub.label}`);
    continue;
  }

  let outcome;
  if (sub.script) {
    outcome = runNodeScript(sub.script);
  } else if (sub.npm) {
    outcome = runNpmScript(sub.npm);
  } else {
    outcome = { status: "SKIP", detail: "no runner" };
  }

  matrix.push({
    id: sub.id,
    label: sub.label,
    status: outcome.status,
    detail: outcome.detail,
  });
  console.log(`${outcome.status}: ${sub.label}`);
}

const outPath = resolve(root, "scripts/production-verification-matrix.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl: process.env.GATE_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://localhost:3000",
      matrix,
    },
    null,
    2
  )
);

const fails = matrix.filter((m) => m.status === "FAIL").length;
const passes = matrix.filter((m) => m.status === "PASS").length;
console.log(`\nMatrix written: ${outPath}`);
console.log(`Summary: ${passes} PASS, ${fails} FAIL, ${matrix.length - passes - fails} SKIP/OTHER`);
process.exit(fails > 0 ? 1 : 0);
