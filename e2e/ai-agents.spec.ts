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
