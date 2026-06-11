import { test, expect } from "@playwright/test";

test.describe("Email infrastructure", () => {
  test("booking status API validates body", async ({ page }) => {
    const response = await page.request.patch("/api/bookings/00000000-0000-0000-0000-000000000001/status", {
      data: { status: "invalid" },
    });
    expect(response.status()).toBe(400);
  });

  test("booking status API rejects invalid transition for missing booking", async ({ page }) => {
    const response = await page.request.patch(
      "/api/bookings/00000000-0000-0000-0000-000000000001/status",
      { data: { status: "confirmed" } }
    );
    expect([404, 409]).toContain(response.status());
  });

  test("forgot password page submits without error UI leak", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel(/email/i).fill("unknown-user@example.com");
    await page.getByRole("button", { name: /send|إرسال/i }).click();
    await expect(page.getByRole("status")).toBeVisible();
  });
});
