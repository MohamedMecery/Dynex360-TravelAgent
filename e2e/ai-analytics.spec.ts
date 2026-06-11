import { test, expect } from "@playwright/test";

test.describe("AI Analytics", () => {
  test("dashboard page loads for tenant admin", async ({ page }) => {
    await page.goto("/ai/analytics");

    await expect(page.getByTestId("ai-analytics-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /AI Agent Analytics|تحليلات وكلاء الذكاء الاصطناعي/i })
    ).toBeVisible();

    await expect(page.getByText(/AI Conversations|محادثات الذكاء الاصطناعي/i)).toBeVisible();
    await expect(page.getByText(/Active AI Users|مستخدمون نشطون/i)).toBeVisible();
    await expect(page.getByText(/Feedback Rate|نسبة التقييم/i)).toBeVisible();
  });

  test("analytics API returns executive KPIs", async ({ page }) => {
    const response = await page.request.get("/api/ai/analytics?preset=30d");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data?: {
        executive?: {
          total_conversations?: number;
          active_users?: number;
          feedback_rate?: number | null;
        };
        agent_usage?: unknown[];
        usage_trends?: { conversation_volume?: unknown[] };
      };
    };

    expect(body.data?.executive).toBeDefined();
    expect(typeof body.data?.executive?.total_conversations).toBe("number");
    expect(typeof body.data?.executive?.active_users).toBe("number");
    expect(Array.isArray(body.data?.agent_usage)).toBe(true);
    expect(Array.isArray(body.data?.usage_trends?.conversation_volume)).toBe(true);
  });

  test("export endpoint returns CSV for feedback", async ({ page }) => {
    const response = await page.request.get(
      "/api/ai/analytics/export?preset=30d&type=feedback"
    );
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("text/csv");
    const text = await response.text();
    expect(text).toContain("feedback_id");
  });
});
