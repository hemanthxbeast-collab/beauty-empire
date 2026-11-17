import { expect, latestEmailLink, test } from "./helpers";

test.describe("Scenario 1 & 2 — registration, verification and protected resources", () => {
  test("a customer can register, is blocked until verified, then signs in", async ({ page }) => {
    const email = `e2e.${Date.now()}@example.test`;
    const password = "Lux!ury2026Glow";

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Meher Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Phone number").fill("98111 22334");
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    // Unverified: sign-in is refused and the account area stays locked.
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount/);

    // Verify through the emailed link → automatically signed in to the customer area.
    const link = await latestEmailLink(email, "verify-email");
    await page.goto(link);
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: /Hello, Meher/ })).toBeVisible();

    // Logout invalidates the session.
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);

    // And sign-in now works.
    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account/);
  });

  test("weak passwords and mismatches are rejected with helpful messages", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Weak Pass");
    await page.getByLabel("Email").fill("weak@example.test");
    await page.getByLabel("Phone number").fill("98111 22335");
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("password");
    await page.getByLabel("Confirm password").fill("different");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Include at least one uppercase letter")).toBeVisible();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });

  test("anonymous visitors are redirected away from every protected area", async ({ page }) => {
    for (const p of ["/account", "/admin", "/staff", "/admin/settings"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/login\?next=/);
    }
    const res = await page.request.post("/api/admin/upload", { headers: { origin: "http://localhost:3100" }, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
    expect(res.status()).toBe(401);
  });
});
