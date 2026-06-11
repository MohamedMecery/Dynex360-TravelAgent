import { test, expect } from "@playwright/test";

const PORTAL_EMAIL = process.env.PORTAL_TEST_EMAIL ?? "portal-customer@demo.travelos.local";
const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";

test.describe("Customer Portal Sprint 8A", () => {
  test("portal login page renders", async ({ page }) => {
    await page.goto("/portal/login");
    await expect(page.getByRole("heading", { name: /customer sign in|تسجيل دخول/i })).toBeVisible();
  });

  test("unauthenticated portal dashboard redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/portal");
    await page.waitForURL("**/portal/login**", { timeout: 15_000 });
    expect(page.url()).toContain("/portal/login");
  });

  test("portal customer can sign in and view dashboard", async ({ page }) => {
    test.skip(!process.env.PORTAL_TEST_EMAIL && !PORTAL_EMAIL.includes("demo"), "PORTAL_TEST_EMAIL not configured");

    await page.context().clearCookies();
    await page.goto("/portal/login");
    await page.locator("#email").fill(PORTAL_EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in|تسجيل/i }).click();

    await page.waitForURL("**/portal", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /dashboard|لوحة/i })).toBeVisible();
  });

  test("portal API rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/portal/dashboard");
    expect(res.status()).toBe(401);
  });

  test("portal accept rejects unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/portal/quotations/00000000-0000-4000-8000-000000000001/accept");
    expect(res.status()).toBe(401);
  });

  test("portal timeline rejects unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/portal/quotations/00000000-0000-4000-8000-000000000001/timeline");
    expect(res.status()).toBe(401);
  });
});
