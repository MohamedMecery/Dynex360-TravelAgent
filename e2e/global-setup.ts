import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  if (!process.env.CI || process.env.E2E_SKIP_PREP === "1") {
    return;
  }

  execSync("node scripts/e2e-ci-prep.mjs", {
    stdio: "inherit",
    env: process.env,
  });
}
