import { execSync, spawn } from "node:child_process";

const port = process.env.E2E_PORT ?? "3099";

console.log("[e2e] Building production bundle…");
execSync("npm run build", { stdio: "inherit" });

console.log(`[e2e] Starting Next.js on http://localhost:${port}`);
const child = spawn("npx", ["next", "start", "-p", port], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
