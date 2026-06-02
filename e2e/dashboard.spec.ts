import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads KPI cards and recent bookings table", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByText("Confirmed")).toBeVisible();
    await expect(page.getByText("Completed")).toBeVisible();
    await expect(page.getByText("Cancelled")).toBeVisible();

    await expect(page.getByText("Total Revenue")).toBeVisible();
    await expect(page.getByText("Outstanding Balance")).toBeVisible();

    const recentSection = page.getByRole("heading", { name: "Recent Bookings" });
    await expect(recentSection).toBeVisible();

    await expect(page.getByRole("columnheader", { name: "Reference" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  });

  test("dashboard stats API returns booking counts", async ({ page }) => {
    const response = await page.request.get("/api/dashboard/stats");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data?: { bookings_by_status?: Record<string, number>; recent_bookings?: unknown[] };
    };

    expect(body.data?.bookings_by_status).toBeDefined();
    expect(typeof body.data?.bookings_by_status?.draft).toBe("number");
    expect(Array.isArray(body.data?.recent_bookings)).toBe(true);
  });
});
