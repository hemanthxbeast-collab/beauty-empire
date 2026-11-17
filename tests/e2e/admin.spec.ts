import { credentials, expect, login, test } from "./helpers";

test.describe("Scenario 3 & 8 — admin management", () => {
  test("an admin can add a new service and it appears on the public site", async ({ page }) => {
    const c = credentials();
    await login(page, c.admin.email, c.admin.password, /\/admin/);
    const name = `Rose Quartz Facial ${Date.now().toString().slice(-5)}`;

    await page.goto("/admin/services/new");
    await page.getByLabel("Service name").fill(name);
    await page.getByLabel("Category").selectOption({ label: "Facial & Skincare" });
    await page.getByLabel("Short description").fill("A cooling rose quartz ritual for calm, glowing skin.");
    await page.getByLabel("Full description").fill("Our rose quartz facial combines gentle exfoliation with a cooling massage for instantly calmer skin.");
    await page.getByRole("spinbutton", { name: "Price (₹)", exact: true }).fill("2199");
    await page.getByLabel("Duration (minutes)").fill("60");
    await page.getByRole("button", { name: "Save service" }).click();
    await expect(page).toHaveURL(/\/admin\/services$/);
    await expect(page.getByRole("link", { name })).toBeVisible();

    await page.goto(`/services?q=${encodeURIComponent("Rose Quartz")}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("₹2,199").first()).toBeVisible();
  });

  test("an admin can confirm a pending booking and the status updates", async ({ page }) => {
    const c = credentials();
    await login(page, c.admin.email, c.admin.password, /\/admin/);
    await page.goto("/admin/bookings?status=PENDING");
    await page.locator('a[href^="/admin/bookings/"]').first().click();
    await expect(page.getByText("Pending").first()).toBeVisible();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Booking marked confirmed.")).toBeVisible();
    await expect(page.getByText("Confirmed").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
  });

  test("dashboard, charts and every admin section render", async ({ page }) => {
    const c = credentials();
    await login(page, c.admin.email, c.admin.password, /\/admin/);
    await expect(page.getByRole("heading", { name: "Weekly appointments" })).toBeVisible();
    for (const [path, heading] of [
      ["/admin/bookings", "Bookings"],
      ["/admin/services", "Services"],
      ["/admin/categories", "Service categories"],
      ["/admin/staff", "Staff"],
      ["/admin/customers", "Customers & messages"],
      ["/admin/gallery", "Gallery"],
      ["/admin/offers", "Offers"],
      ["/admin/reviews", "Reviews"],
      ["/admin/payments", "Payments"],
      ["/admin/settings", "Settings"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });
});
