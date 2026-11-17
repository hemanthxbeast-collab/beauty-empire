import { expect, test } from "./helpers";

test.describe("Responsive layout & public pages", () => {
  for (const path of ["/", "/services", "/bridal", "/gallery", "/offers", "/about", "/contact", "/book"]) {
    test(`${path} renders without horizontal overflow`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("mobile navigation opens and links work", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Bridal Studio" }).click();
    await expect(page).toHaveURL(/\/bridal/);
  });
});
