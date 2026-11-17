import { expect, latestEmailLink, test } from "./helpers";

test.describe("F02/F07 — negative sign-in and password recovery", () => {
  test("F02-N1 wrong password is rejected with a clear message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("riya@example.test");
    await page.getByRole("textbox", { name: "Password", exact: true }).fill("Definitely-Wrong-1!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("F07-H1 forgot password → email link → reset → sign in with the new password", async ({ page }) => {
    const email = "neha@example.test"; // seeded demo customer
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    const link = await latestEmailLink(email, "reset-password");
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    const pw = `Reset-${Date.now()}-Aa1!`;
    await page.getByRole("textbox", { name: "New password", exact: true }).fill(pw);
    await page.getByLabel("Confirm new password").fill(pw);
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page).toHaveURL(/\/login\?reset=1/);

    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(pw);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account/);
  });

  test("F07-N1 an invalid reset token is refused", async ({ page }) => {
    await page.goto("/reset-password?token=not-a-real-token");
    await page.getByRole("textbox", { name: "New password", exact: true }).fill("Brand-New-Pass1!");
    await page.getByLabel("Confirm new password").fill("Brand-New-Pass1!");
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /invalid or has expired/i })).toBeVisible();
  });
});
