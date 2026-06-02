import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const authFile = "e2e/.auth/user.json";

setup("authenticate as tenant admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? "eng.m.mecery@gmail.com";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "TravelOS@2026";

  mkdirSync(dirname(authFile), { recursive: true });

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Sign in to TravelOS/i })).toBeVisible({
    timeout: 30_000,
  });

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/dashboard", { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
