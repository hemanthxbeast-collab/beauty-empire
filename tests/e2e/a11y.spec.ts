import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { credentials, expect, login, pickDay, test } from "./helpers";

/** WCAG 2.1 AA scan of the current state; serious/critical violations fail the test. */
async function scan(page: Page, label: string) {
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
}

test.describe("Accessibility of interactive states (axe, WCAG 2.1 AA)", () => {
  // Scan settled UI: with reduced motion, entrance/exit animations do not leave elements at partial opacity.
  test.use({ reducedMotion: "reduce" });

  test("booking wizard — every step", async ({ page }) => {
    await page.goto("/book");
    await scan(page, "step 1");
    await page.getByRole("button", { name: /Gold Facial/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await scan(page, "step 2");
    await page.getByRole("button", { name: /No preference/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await scan(page, "step 3 calendar");
    await pickDay(page, 4);
    await expect(page.locator("button[data-time]").first()).toBeVisible();
    await scan(page, "step 4 times");
    await page.locator("button[data-time]").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click(); // submit empty details → errors
    await expect(page.getByText("Please enter your full name")).toBeVisible();
    await scan(page, "step 5 errors");
    await page.getByLabel("Full name").fill("Axe Tester");
    await page.getByLabel("Phone number").fill("98765 33333");
    await page.getByLabel("Email").fill("axe@example.test");
    await page.getByRole("button", { name: "Continue" }).click();
    await scan(page, "step 6 payment");
  });

  test("dialogs: mobile menu, gallery lightbox; form error states", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page, "mobile menu");
    await page.keyboard.press("Escape");
    await page.goto("/gallery");
    await page.getByRole("button", { name: /^Open image:/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await scan(page, "lightbox");
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await scan(page, "login errors");
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    await scan(page, "register errors");
  });

  test("signed-in screens: appointment detail with cancel dialog, admin booking detail", async ({ page }) => {
    const c = credentials();
    await login(page, c.customer.email, c.customer.password, /\/account/);
    await page.goto("/account/appointments");
    await page.locator('a[href^="/account/appointments/"]').first().click();
    await scan(page, "appointment detail");
    const cancel = page.getByRole("button", { name: "Cancel appointment" });
    if (await cancel.count()) {
      await cancel.click();
      await scan(page, "cancel dialog");
      await page.keyboard.press("Escape");
    }
    await page.context().clearCookies();
    await login(page, c.admin.email, c.admin.password, /\/admin/);
    await page.goto("/admin/bookings");
    await page.locator('a[href^="/admin/bookings/"]').first().click();
    await scan(page, "admin booking detail");
  });
});
