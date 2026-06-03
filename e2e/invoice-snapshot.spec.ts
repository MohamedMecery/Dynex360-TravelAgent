import { test, expect } from "@playwright/test";

const DEMO_BOOKING_REF = "DEMO-BK-005";

test.describe("Invoice booking line snapshot", () => {
  test("create invoice from seeded booking shows line items snapshot", async ({ page }) => {
    await page.goto("/invoices/create");
    await expect(page.getByRole("heading", { name: /Create Invoice|إنشاء فاتورة/i })).toBeVisible();

    const bookingSelect = page.locator("select").first();
    await bookingSelect.selectOption({ label: DEMO_BOOKING_REF });

    await expect(page.getByText(DEMO_BOOKING_REF)).toBeVisible();

    const preview = page.getByText(/Booking line items|بنود الحجز/i);
    await expect(preview.first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /Create Invoice|إنشاء فاتورة/i }).click();
    await page.waitForURL("**/invoices", { timeout: 30_000 });

    await page.goto("/invoices");
    await page.getByRole("row").filter({ hasText: DEMO_BOOKING_REF }).getByRole("link", { name: /View|عرض/i }).click();
    await page.waitForURL("**/invoices/show/**");

    const snapshot = page.getByTestId("invoice-booking-line-items");
    await expect(snapshot).toBeVisible();
    await expect(snapshot.getByRole("columnheader", { name: /Description|الوصف/i })).toBeVisible();
    await expect(snapshot.getByText(/Lines subtotal|مجموع البنود/i)).toBeVisible();
  });
});
