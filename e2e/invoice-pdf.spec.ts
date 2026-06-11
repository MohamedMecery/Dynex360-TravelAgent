import { test, expect } from "@playwright/test";

const DEMO_BOOKING_REF = "DEMO-BK-005";

test.describe("Invoice PDF download", () => {
  test("download PDF from invoice show page", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: /Invoices|الفواتير/i })).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: DEMO_BOOKING_REF });
    const hasInvoice = (await row.count()) > 0;

    if (!hasInvoice) {
      await page.goto("/invoices/create");
      const bookingSelect = page.locator("select").first();
      const bookingValue = await bookingSelect
        .locator("option", { hasText: DEMO_BOOKING_REF })
        .first()
        .getAttribute("value");
      if (!bookingValue) {
        throw new Error(
          `${DEMO_BOOKING_REF} not found — run npm run db:seed (or e2e:ci-prep in CI).`
        );
      }
      await bookingSelect.selectOption(bookingValue);
      await page.getByRole("button", { name: /Create Invoice|إنشاء فاتورة/i }).click();
      await page.waitForURL("**/invoices", { timeout: 30_000 });
      await page.goto("/invoices");
    }

    await page
      .getByRole("row")
      .filter({ hasText: DEMO_BOOKING_REF })
      .getByRole("link", { name: /View|عرض/i })
      .first()
      .click();
    await page.waitForURL("**/invoices/show/**");

    const pdfResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/invoices/") &&
        response.url().endsWith("/pdf") &&
        response.request().method() === "GET"
    );

    await page.getByTestId("download-invoice-pdf").click();

    const pdfResponse = await pdfResponsePromise;
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

    const body = await pdfResponse.body();
    expect(body.length).toBeGreaterThan(500);
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
  });
});
