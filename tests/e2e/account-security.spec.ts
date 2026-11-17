import { credentials, db, expect, login, test } from "./helpers";

const ORIGIN = { origin: "http://localhost:3100" };

test.describe("Backend checklist — profile endpoint and account deletion", () => {
  test("Better Auth update-user enforces the app's rules (BUG-004)", async ({ page }) => {
    const c = credentials();
    const email = "shreya@example.test"; // seeded demo customer, shares SEED_CUSTOMER_PASSWORD
    await login(page, email, c.customer.password, /\/account/);
    const bad = await page.request.post("/api/auth/update-user", { headers: ORIGIN, data: { phone: "12345" } });
    expect(bad.status()).toBe(400);
    const img = await page.request.post("/api/auth/update-user", { headers: ORIGIN, data: { image: "https://evil.example/pixel.png" } });
    expect(img.status()).toBe(400);
    const badName = await page.request.post("/api/auth/update-user", { headers: ORIGIN, data: { name: "<script>" } });
    expect(badName.status()).toBe(400);
    const ok = await page.request.post("/api/auth/update-user", { headers: ORIGIN, data: { phone: "98765 44444" } });
    expect(ok.status()).toBe(200);
    const row = await db((cl) => cl.query('select phone from "user" where email = $1', [email]));
    expect(row.rows[0].phone).toBe("+919876544444");
  });

  test("a customer with upcoming bookings cannot delete the account; one without can, and it is really gone", async ({ page }) => {
    const c = credentials();
    // Riya has upcoming demo bookings → refused.
    await login(page, c.customer.email, c.customer.password, /\/account/);
    await page.goto("/account/profile");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByRole("alertdialog").getByRole("textbox", { name: "Confirm with your password", exact: true }).fill(c.customer.password);
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText(/cancel your upcoming appointments/i);
    await page.keyboard.press("Escape");
    await page.context().clearCookies();

    // A fresh account (verified directly in the test DB) can delete itself.
    const email = `erase.${Date.now()}@example.test`;
    const password = "Erase-Me-2026!";
    const res = await page.request.post("/api/auth/sign-up/email", { headers: ORIGIN, data: { name: "Erase Me", email, password, phone: "98765 55555" } });
    expect(res.ok()).toBe(true);
    await db((cl) => cl.query('update "user" set "emailVerified" = true where email = $1', [email]));
    await login(page, email, password, /\/account/);
    await page.goto("/account/profile");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByRole("alertdialog").getByRole("textbox", { name: "Confirm with your password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/account=deleted/);
    const left = await db((cl) => cl.query('select count(*)::int as n from "user" where email = $1', [email]));
    expect(left.rows[0].n).toBe(0);
  });
});
