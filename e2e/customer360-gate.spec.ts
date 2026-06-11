import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PASSWORD = process.env.GATE_TEST_PASSWORD ?? "TravelOS@2026";

const USERS = {
  sales_agent: {
    email: process.env.GATE_SALES_EMAIL ?? "wp3a-sales@demo.travelos.local",
    role: "sales_agent",
  },
  finance_officer: {
    email: process.env.GATE_FINANCE_EMAIL ?? "wp3a-finance@demo.travelos.local",
    role: "finance_officer",
  },
  tenant_admin: {
    email: process.env.GATE_ADMIN_EMAIL ?? "eng.m.mecery@gmail.com",
    role: "tenant_admin",
  },
  foreign_sales: {
    email: process.env.GATE_FOREIGN_EMAIL ?? "wp3a-foreign@demo.travelos.local",
    role: "foreign",
  },
} as const;

const CUSTOMERS = {
  small: "00000000-0005-4000-8000-000000000004",
  medium: "00000000-0005-4000-8000-000000000007",
  heavy: "00000000-00ea-4000-8000-000000000001",
  foreignProbe: "00000000-0005-4000-8000-000000000001",
} as const;

const TAB_KEYS = [
  "overview",
  "timeline",
  "opportunities",
  "activities",
  "bookings",
  "invoices",
  "payments",
  "tickets",
  "revenue",
] as const;

interface GateResult {
  section: string;
  item: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail?: string;
}

const results: GateResult[] = [];

function record(section: string, item: string, status: "PASS" | "FAIL" | "SKIP", detail?: string) {
  results.push({ section, item, status, detail });
}

async function login(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#email")).toBeVisible({ timeout: 30_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
}

async function fetch360(
  request: APIRequestContext,
  customerId: string
): Promise<{ status: number; ms: number; bytes: number; body: unknown }> {
  const start = Date.now();
  const res = await request.get(`/api/customers/${customerId}/360`);
  const buf = await res.body();
  const ms = Date.now() - start;
  let body: unknown = null;
  try {
    body = JSON.parse(buf.toString("utf8"));
  } catch {
    body = null;
  }
  return { status: res.status(), ms, bytes: buf.length, body };
}

async function fetchTimeline(
  request: APIRequestContext,
  customerId: string,
  limit = 200
): Promise<{ status: number; ms: number; bytes: number; rows: number }> {
  const start = Date.now();
  const res = await request.get(
    `/api/customers/${customerId}/360/timeline?limit=${limit}`
  );
  const buf = await res.body();
  const ms = Date.now() - start;
  const json = JSON.parse(buf.toString("utf8")) as { data?: unknown[] };
  return {
    status: res.status(),
    ms,
    bytes: buf.length,
    rows: Array.isArray(json.data) ? json.data.length : 0,
  };
}

test.describe("Sprint 5 Customer 360 Gate", () => {
  test.afterAll(() => {
    mkdirSync(resolve("docs/03-Architecture"), { recursive: true });
    writeFileSync(
      resolve("scripts/sprint5-gate-results.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
    );
  });

  test.describe("API security", () => {
    test("foreign tenant cannot read home-tenant customer (404)", async ({ page }) => {
      await login(page, USERS.foreign_sales.email);
      const res = await fetch360(page.request, CUSTOMERS.foreignProbe);
      expect(res.status).toBe(404);
      record("API security", "cross-tenant 404", res.status === 404 ? "PASS" : "FAIL", `status=${res.status}`);
    });

    test("unknown customer id returns 404", async ({ page }) => {
      await login(page, USERS.tenant_admin.email);
      const fakeId = "00000000-0000-4000-8000-000000000099";
      const res = await fetch360(page.request, fakeId);
      expect(res.status).toBe(404);
      record("API security", "unknown customer 404", res.status === 404 ? "PASS" : "FAIL");
    });
  });

  test.describe("Performance audit", () => {
    test("GET 360 — small / medium / heavy", async ({ page }) => {
      await login(page, USERS.tenant_admin.email);
      const profiles = [
        { label: "small", id: CUSTOMERS.small },
        { label: "medium", id: CUSTOMERS.medium },
        { label: "heavy", id: CUSTOMERS.heavy },
      ];
      for (const p of profiles) {
        const res = await fetch360(page.request, p.id);
        expect(res.status).toBe(200);
        const payloadKb = Math.round(res.bytes / 1024);
        const timelinePreview = (res.body as { data?: { timeline_preview?: unknown[] } })?.data
          ?.timeline_preview;
        const previewCount = Array.isArray(timelinePreview) ? timelinePreview.length : 0;
        const passTime = res.ms < 3000;
        const passSize = res.bytes < 200 * 1024;
        record(
          "Performance",
          `360 ${p.label} time`,
          passTime ? "PASS" : "FAIL",
          `${res.ms}ms`
        );
        record(
          "Performance",
          `360 ${p.label} size`,
          passSize ? "PASS" : "FAIL",
          `${payloadKb}KB preview=${previewCount}`
        );
        expect(res.status).toBe(200);
        expect(passTime).toBeTruthy();
        expect(passSize).toBeTruthy();
      }
    });

    test("GET timeline limit=200 — heavy customer", async ({ page }) => {
      await login(page, USERS.tenant_admin.email);
      const res = await fetchTimeline(page.request, CUSTOMERS.heavy, 200);
      expect(res.status).toBe(200);
      const passTime = res.ms < 3000;
      record(
        "Worst-case timeline",
        "limit=200 duration",
        passTime ? "PASS" : "FAIL",
        `${res.ms}ms`
      );
      record(
        "Worst-case timeline",
        "payload size",
        res.bytes < 200 * 1024 ? "PASS" : "FAIL",
        `${Math.round(res.bytes / 1024)}KB`
      );
      record(
        "Worst-case timeline",
        "returned rows",
        res.rows > 0 ? "PASS" : "FAIL",
        String(res.rows)
      );
      expect(passTime).toBeTruthy();
      expect(res.rows).toBeGreaterThan(50);
    });
  });

  for (const [roleKey, user] of Object.entries(USERS)) {
    if (roleKey === "foreign_sales") continue;

    test.describe(`UI QA — ${roleKey}`, () => {
      test.beforeEach(async ({ page }) => {
        await login(page, user.email);
      });

      test("Customer 360 tabs and financial gating", async ({ page }) => {
        await page.goto(`/customers/show/${CUSTOMERS.heavy}`, {
          waitUntil: "domcontentloaded",
        });
        await expect(page.getByRole("heading", { level: 2 })).toBeVisible({
          timeout: 30_000,
        });

        const expectFinancial =
          roleKey === "finance_officer" || roleKey === "tenant_admin";

        for (const tab of TAB_KEYS) {
          if (tab === "revenue" && !expectFinancial) {
            const revenueBtn = page.locator("nav").getByRole("button", {
              name: "Revenue",
              exact: true,
            });
            await expect(revenueBtn).toHaveCount(0);
            record(`UI ${roleKey}`, "Revenue tab hidden", "PASS");
            continue;
          }
          const tabLabel =
            tab === "tickets"
              ? "Support tickets"
              : tab.charAt(0).toUpperCase() + tab.slice(1);
          const btn = page.locator("nav").getByRole("button", {
            name: tabLabel,
            exact: true,
          });
          if (tab === "revenue" && expectFinancial) {
            await expect(btn).toBeVisible();
          }
          if (tab !== "revenue" || expectFinancial) {
            await btn.click();
            await page.waitForTimeout(300);
            record(`UI ${roleKey}`, `Tab ${tab}`, "PASS");
          }
        }

        if (!expectFinancial) {
          await expect(page.getByText(/Lifetime customer value/i)).toHaveCount(0);
          await expect(page.getByText(/Outstanding balance/i)).toHaveCount(0);
          record(`UI ${roleKey}`, "Financial KPIs hidden", "PASS");
        } else {
          await expect(page.getByText(/Lifetime customer value/i).first()).toBeVisible();
          record(`UI ${roleKey}`, "Financial KPIs visible", "PASS");
        }

        // Timeline bucket + load more on heavy customer
        await page.locator("nav").getByRole("button", { name: "Timeline", exact: true }).click();
        await page.getByRole("button", { name: "Sales" }).click();
        const eventBadge = page.locator("span").filter({ hasText: /activity\.|booking_created|payment_received/ }).first();
        await expect(eventBadge).toBeVisible({ timeout: 15_000 });
        record(`UI ${roleKey}`, "Timeline buckets + event_type", "PASS");

        const loadMore = page.getByRole("button", { name: /Load more/i });
        if (await loadMore.isVisible()) {
          await loadMore.click();
          record(`UI ${roleKey}`, "Timeline pagination", "PASS");
        } else {
          record(`UI ${roleKey}`, "Timeline pagination", "SKIP", "no load more visible");
        }
      });
    });
  }
});
