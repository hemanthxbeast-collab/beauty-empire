import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

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
  await page.getByRole("radio", { name: /No preference/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible();
  const enabled = page.locator('[role="gridcell"]:not([disabled])');
  const count = await enabled.count();
  const target = Math.min(opts.daysAhead ?? 3, count - 1);
  if (count <= target) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  await page.locator('[role="gridcell"]:not([disabled])').nth(Math.min(target, (await page.locator('[role="gridcell"]:not([disabled])').count()) - 1)).click();
  await expect(page.getByRole("heading", { name: "Choose a time" })).toBeVisible();
  const firstSlot = page.locator('[role="radiogroup"] [role="radio"]').first();
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
