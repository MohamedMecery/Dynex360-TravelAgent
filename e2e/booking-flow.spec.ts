import { test, expect, type Page } from "@playwright/test";
import { e2eRunId, futureTravelDate } from "./helpers/test-data";

const flowState = {
  customerLastName: "",
  packageTitle: "",
  bookingShowUrl: "",
  bookingReference: "",
};

async function openBookingFromList(page: Page, reference: string): Promise<void> {
  await page.goto("/bookings");
  await page.getByLabel("Search by reference").fill(reference);
  await page.getByRole("row").filter({ hasText: reference }).getByRole("link", { name: "View" }).click();
  await page.waitForURL("**/bookings/show/**");
}

test.describe.serial("Booking MVP flow", () => {
  test.beforeAll(() => {
    const runId = e2eRunId();
    flowState.customerLastName = `BookFlow-${runId}`;
    flowState.packageTitle = `E2E Package ${runId}`;
  });

  test("create customer for booking flow", async ({ page }) => {
    const email = `e2e-booking-${Date.now()}@test.local`;

    await page.goto("/customers/create");
    await page.getByLabel("First Name").fill("Booking");
    await page.getByLabel("Last Name").fill(flowState.customerLastName);
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Create" }).click();

    await page.waitForURL("**/customers/show/**");
    await expect(page.getByText(flowState.customerLastName)).toBeVisible();
  });

  test("create package, add itinerary and pricing, publish", async ({ page }) => {
    await page.goto("/packages/create");

    await page.locator("#package-title").fill(flowState.packageTitle);
    await page.locator("#package-description").fill("Automated E2E package for booking flow validation.");
    await page.locator("#package-duration").fill("3");

    const destinationSelect = page.locator("select").first();
    if ((await destinationSelect.locator("option").count()) > 1) {
      await destinationSelect.selectOption({ index: 1 });
    }

    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL("**/packages/show/**");
    await expect(page.getByRole("heading", { name: flowState.packageTitle })).toBeVisible();

    await page.getByRole("button", { name: /Add day/i }).click();
    const itineraryForm = page.locator("form").filter({ hasText: /Add day/i });
    await itineraryForm.locator('input[type="number"]').fill("1");
    await itineraryForm.locator('input[type="text"]').fill("Arrival and city tour");
    await itineraryForm.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Arrival and city tour")).toBeVisible({ timeout: 15_000 });

    const pricingForm = page.locator("form").filter({ has: page.getByRole("button", { name: /Save pricing/i }) });
    await pricingForm.locator('input[type="number"]').first().fill("999");
    await pricingForm.getByRole("button", { name: /Save pricing/i }).click();
    await expect(page.getByText("Pricing saved.")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("create draft booking with traveler", async ({ page }) => {
    await page.goto("/bookings/create");

    await page
      .locator("select")
      .nth(0)
      .selectOption({ label: `Booking ${flowState.customerLastName}` });
    await page.locator("select").nth(1).selectOption({ label: flowState.packageTitle });
    await page.locator('input[type="date"]').fill(futureTravelDate(120));

    const travelerCard = page.locator(".rounded-md.border.p-4").first();
    await travelerCard.locator('input[type="text"]').first().fill("Lead");
    await travelerCard.locator('input[type="text"]').nth(1).fill("Traveler");

    await page.getByRole("button", { name: "Create Booking" }).click();
    await page.waitForURL("**/bookings/show/**", { timeout: 45_000 });

    flowState.bookingShowUrl = page.url();
    flowState.bookingReference =
      (await page.getByRole("heading").first().textContent())?.trim() ?? "";

    expect(flowState.bookingReference.length).toBeGreaterThan(0);
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText("Unpaid")).toBeVisible();
  });

  test("confirm booking", async ({ page }) => {
    await page.goto(flowState.bookingShowUrl);
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Confirmed")).toBeVisible({ timeout: 15_000 });
  });

  test("record payment and verify paid status", async ({ page }) => {
    await page.goto(flowState.bookingShowUrl);
    await page.getByRole("link", { name: "Record Payment" }).click();
    await page.waitForURL("**/payments/create**");

    await page.locator('input[type="number"]').first().fill("999");
    await page.getByRole("button", { name: "Record Payment" }).click();
    await page.waitForURL("**/payments", { timeout: 30_000 });

    await openBookingFromList(page, flowState.bookingReference);
    await expect(page.getByText("Paid")).toBeVisible({ timeout: 20_000 });
  });
});
