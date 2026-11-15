import { expect, test } from "@playwright/test";
import { bookViaWizard, credentials, login } from "./helpers";

test.describe("Scenario 4 & 9 — customer booking lifecycle", () => {
  test("a signed-in customer books, sees and cancels an appointment", async ({ page }) => {
    const c = credentials();
    await login(page, c.customer.email, c.customer.password, /\/account/);

    const confirmation = await bookViaWizard(page, "Classic Manicure", { daysAhead: 4 });
    const reference = confirmation.match(/BE-[A-Z0-9]{8}/)![0];
    await expect(page.getByRole("heading", { name: /booking received|confirmed/i })).toBeVisible();
    await expect(page.getByText("Classic Manicure")).toBeVisible();

    await page.goto("/account/appointments");
    const row = page.getByRole("link", { name: new RegExp(reference) });
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByText(reference)).toBeVisible();

    await page.getByRole("button", { name: "Cancel appointment" }).click();
    await page.getByRole("button", { name: "Yes, cancel" }).click();
    await expect(page.getByText("Cancelled").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel appointment" })).toHaveCount(0);
  });

  test("a guest can book and view the confirmation only through its private link", async ({ page, browser }) => {
    const url = await bookViaWizard(page, "Eyebrow Threading", {
      daysAhead: 5,
      guest: { name: "Guest Booker", email: `guest.${Date.now()}@example.test`, phone: "98765 11111" },
    });
    await expect(page.getByText("Eyebrow Threading")).toBeVisible();
    // Without the signed token the confirmation is not found.
    const anon = await browser.newPage();
    const res = await anon.goto(url.split("?")[0]!);
    expect(res?.status()).toBe(404);
    await anon.close();
  });
});
