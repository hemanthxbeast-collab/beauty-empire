import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { Client } from "pg";

/**
 * Every spec uses this `test`: it fails on browser console errors and on any 5xx response,
 * so silent breakage (CSP violations, hydration errors, server crashes) cannot pass.
 */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text();
        // Expected: client errors the tests deliberately provoke (400/401/403/404/409/422/429) are logged by the browser.
        if (/Failed to load resource: the server responded with a status of (400|401|403|404|409|422|429)/.test(t)) return;
        if (/net::ERR_FAILED|net::ERR_ABORTED|net::ERR_INTERNET_DISCONNECTED|Failed to fetch/.test(t)) return; // deliberate network-failure tests
        problems.push(`console: ${t}`);
      });
      page.on("response", (r) => {
        if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`);
      });
      await use();
      expect(problems, problems.join(" | ")).toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function db<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: process.env.TEST_DATABASE_URL ?? "postgresql://beauty:beauty_dev_pw@localhost:5433/beauty_empire_test?schema=public" });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

type Creds = { admin: { email: string; password: string }; staff: { email: string; password: string }; customer: { email: string; password: string }; otherCustomer: { email: string } };

export function credentials(): Creds {
  return JSON.parse(readFileSync(path.join(process.cwd(), "test-results", ".e2e-credentials.json"), "utf8")) as Creds;
}

export async function login(page: Page, email: string, password: string, expectPath: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(expectPath);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Reads the newest development-outbox email sent to `to` and extracts the first link containing `contains`. */
export async function latestEmailLink(to: string, contains: string) {
  const dir = path.join(process.cwd(), ".dev-mail");
  const safe = to.replace(/[^a-z0-9@._-]/gi, "_");
  for (let i = 0; i < 20; i++) {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(`-${safe}.html`))
      .sort();
    for (const f of files.reverse()) {
      const html = readFileSync(path.join(dir, f), "utf8");
      const m = html.match(new RegExp(`href="([^"]*${contains}[^"]*)"`));
      if (m) return m[1]!.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} containing ${contains}`);
}

/** Walks the booking wizard: one service, any professional, an enabled date ≥ `daysAhead` and the first time. */
export async function bookViaWizard(page: Page, serviceName: string, opts: { daysAhead?: number; guest?: { name: string; email: string; phone: string } } = {}) {
  await page.goto("/book");
  await page.getByRole("button", { name: new RegExp(serviceName) }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Choose your professional" })).toBeVisible();
  await page.getByRole("button", { name: /No preference/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible();
  await pickDay(page, opts.daysAhead ?? 3);
  await expect(page.getByRole("heading", { name: "Choose a time" })).toBeVisible();
  const firstSlot = page.locator("button[data-time]").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  if (opts.guest) {
    await page.getByLabel("Full name").fill(opts.guest.name);
    await page.getByLabel("Phone number").fill(opts.guest.phone);
    await page.getByLabel("Email").fill(opts.guest.email);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
  await page.getByLabel(/I have read and accept/).check();
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page).toHaveURL(/\/book\/confirmation\/BE-/);
  return page.url();
}

/** Clicks the n-th enabled day in the calendar, moving to next month if needed. */
export async function pickDay(page: Page, nth: number) {
  const days = page.locator("button[data-day]:not([disabled])");
  if ((await days.count()) <= nth) await page.getByRole("button", { name: "Next month" }).click();
  const count = await days.count();
  await days.nth(Math.min(nth, count - 1)).click();
}
