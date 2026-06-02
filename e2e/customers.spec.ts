import { test, expect } from "@playwright/test";
import { e2eRunId } from "./helpers/test-data";

test.describe("Customers", () => {
  test("create customer and find in list via search", async ({ page }) => {
    const runId = e2eRunId();
    const lastName = `E2E-${runId}`;
    const email = `e2e-${runId}@test.local`;

    await page.goto("/customers/create");

    await page.getByLabel("First Name").fill("Playwright");
    await page.getByLabel("Last Name").fill(lastName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Phone").fill("+1-555-0199");

    await page.getByRole("button", { name: "Create" }).click();

    await page.waitForURL("**/customers/show/**");
    await expect(page.getByText("Playwright")).toBeVisible();
    await expect(page.getByText(lastName)).toBeVisible();

    await page.goto("/customers");
    await page.getByPlaceholder(/Name, email, phone, or company/i).fill(email);

    await expect(page.getByRole("cell", { name: email })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("cell", { name: new RegExp(lastName) })).toBeVisible();
  });
});
