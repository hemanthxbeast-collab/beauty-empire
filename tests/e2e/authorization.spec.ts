import { expect, test } from "@playwright/test";
import { credentials, login } from "./helpers";

test.describe("Scenario 6 & 7 — role and ownership boundaries", () => {
  test("a customer cannot reach admin/staff areas or other customers' bookings", async ({ page }) => {
    const c = credentials();
    // Find a booking belonging to ANOTHER customer as admin first.
    await login(page, c.admin.email, c.admin.password, /\/admin/);
    await page.goto(`/admin/bookings?q=${encodeURIComponent(c.otherCustomer.email)}`);
    const href = await page.locator('a[href^="/admin/bookings/"]').first().getAttribute("href");
    const otherId = href!.split("/").pop()!;
    await page.context().clearCookies();

    await login(page, c.customer.email, c.customer.password, /\/account/);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    const res = await page.goto(`/account/appointments/${otherId}`);
    expect(res?.status()).toBe(404);
  });

  test("staff can use the staff dashboard but not admin pages or admin operations", async ({ page }) => {
    const c = credentials();
    await login(page, c.staff.email, c.staff.password, /\/staff/);
    await expect(page.getByRole("heading", { name: /Good day, Priya/ })).toBeVisible();
    await page.goto("/staff/availability");
    await expect(page.getByRole("heading", { name: "Availability" })).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    // Admin-only upload endpoint is forbidden for staff.
    const res = await page.request.post("/api/admin/upload", { headers: { origin: "http://localhost:3100" }, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
    expect(res.status()).toBe(403);
  });

  test("cross-site requests to payment endpoints are refused", async ({ request }) => {
    const res = await request.post("/api/payments/razorpay/order", { headers: { origin: "https://evil.example" }, data: { appointmentId: "abc" } });
    expect(res.status()).toBe(403);
    const hook = await request.post("/api/payments/razorpay/webhook", { headers: { "x-razorpay-signature": "bad" }, data: { event: "payment.captured" } });
    expect(hook.status()).toBe(401);
    const cron = await request.get("/api/cron/reminders");
    expect(cron.status()).toBe(401);
  });
});
