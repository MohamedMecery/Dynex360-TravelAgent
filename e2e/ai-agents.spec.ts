import { test, expect } from "@playwright/test";

test.describe("AI agents (smoke)", () => {
  test("Knowledge Agent page loads", async ({ page }) => {
    await page.goto("/ai/knowledge");
    await expect(page.getByRole("heading", { name: /Knowledge Agent|وكيل المعرفة/i })).toBeVisible();
    await expect(page.getByPlaceholder(/policy|سياسة|packages/i)).toBeVisible();
  });

  test("Booking Agent page loads with draft builder", async ({ page }) => {
    await page.goto("/ai/booking");
    await expect(page.getByRole("heading", { name: /Booking Agent|وكيل الحجز/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Draft builder|منشئ المسودة/i })).toBeVisible();
  });

  test("Support Agent page loads", async ({ page }) => {
    await page.goto("/ai/support");
    await expect(page.getByRole("heading", { name: /Support Agent|وكيل الدعم/i })).toBeVisible();
  });

  test("AI conversation history page loads", async ({ page }) => {
    await page.goto("/ai/history");
    await expect(
      page.getByRole("heading", { name: /AI Conversation History|سجل محادثات/i })
    ).toBeVisible();
  });

  test("Booking Agent opens draft builder form", async ({ page }) => {
    await page.goto("/ai/booking");
    await page.getByRole("button", { name: /Draft builder|منشئ المسودة/i }).click();
    await expect(page.getByText(/Customer|العميل/i).first()).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Preview draft|معاينة المسودة/i })).toBeVisible();
  });

  test("Booking Agent package search prompt returns assistant reply", async ({ page }) => {
    await page.goto("/ai/booking");
    await page
      .getByRole("button", { name: /Show Dubai packages under \$1500/i })
      .click();

    await expect(page.locator(".bg-muted").first()).toBeVisible({ timeout: 60_000 });
  });

  test("Support Agent tickets list loads", async ({ page }) => {
    await page.goto("/ai/support/tickets");
    await expect(
      page.getByRole("heading", { name: /Support Tickets|تذاكر الدعم/i })
    ).toBeVisible();
  });

  test("Support Agent answers booking status lookup", async ({ page }) => {
    await page.goto("/ai/support");
    const input = page.getByPlaceholder(/issue|مشكلة|FAQ/i);
    await input.fill("What is the status of booking DEMO-BK-005?");
    await page.getByRole("button", { name: /Send|إرسال/i }).click();

    await expect(
      page.getByText(/DEMO-BK-005|confirmed|مؤكد|status/i).first()
    ).toBeVisible({ timeout: 60_000 });
  });

  test("Knowledge Agent accepts a question (API)", async ({ page }) => {
    await page.goto("/ai/knowledge");
    const input = page.getByPlaceholder(/policy|سياسة|packages/i);
    await input.fill("What is the cancellation policy?");
    await page.getByRole("button", { name: /Send|إرسال/i }).click();

    await expect(
      page.getByText(/cancellation|إلغاء|policy|سياسة/i).first()
    ).toBeVisible({ timeout: 60_000 });
  });
});
