import { bookViaWizard, credentials, db, expect, login, pickDay, test } from "./helpers";

test.describe("F01/F03 edge cases — booking resilience", () => {
  test("F01-E1 double-clicking Confirm creates exactly one booking", async ({ page }) => {
    const email = `dbl.${Date.now()}@example.test`;
    await page.goto("/book");
    await page.getByRole("button", { name: /Clean-Up/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /No preference/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await pickDay(page, 6);
    await page.locator("button[data-time]").first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("Double Click");
    await page.getByLabel("Phone number").fill("98765 22222");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel(/I have read and accept/).check();
    await page.getByRole("button", { name: /Confirm booking/ }).dblclick();
    await expect(page).toHaveURL(/\/book\/confirmation\/BE-/);
    const count = await db((c) => c.query("select count(*)::int as n from appointment where \"customerEmail\" = $1", [email]));
    expect(count.rows[0].n).toBe(1);
  });

  test("F01-E2 a failed availability request shows a retry that recovers", async ({ page }) => {
    await page.goto("/book");
    await page.getByRole("button", { name: /Eyebrow Threading/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /No preference/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.route("**/api/availability**", (r) => r.abort("internetdisconnected"));
    await pickDay(page, 5);
    await expect(page.getByRole("alert").filter({ hasText: /offline|couldn't load/i })).toBeVisible();
    await page.unroute("**/api/availability**");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator("button[data-time]").first()).toBeVisible();
  });

  test("F03-H2 a customer requests a reschedule and can add the booking to a calendar", async ({ page }) => {
    const c = credentials();
    await login(page, c.customer.email, c.customer.password, /\/account/);
    const url = await bookViaWizard(page, "Hair Wash and Blow Dry", { daysAhead: 7 });
    const reference = url.match(/BE-[A-Z0-9]{8}/)![0];

    // Add to calendar from the confirmation page returns a real iCalendar file.
    const ics = page.getByRole("link", { name: "Add to calendar" });
    await expect(ics).toBeVisible();
    const res = await page.request.get((await ics.getAttribute("href"))!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    expect(await res.text()).toContain("BEGIN:VEVENT");

    await page.goto("/account/appointments");
    await page.getByRole("link", { name: new RegExp(reference) }).click();
    await page.getByRole("button", { name: "Request reschedule" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("button[data-day]:not([disabled])").nth(9).click();
    await dialog.locator('[role="group"][aria-label="Available times"] button').first().click();
    await dialog.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Reschedule requested/).first()).toBeVisible();
  });
});
