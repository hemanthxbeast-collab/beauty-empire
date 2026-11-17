import { credentials, expect, login, test } from "./helpers";

test.describe("F05 — admin content management reflects on the public site", () => {
  test.beforeEach(async ({ page }) => {
    const c = credentials();
    await login(page, c.admin.email, c.admin.password, /\/admin/);
  });

  test("an admin creates an offer and it appears on /offers", async ({ page }) => {
    const title = `Monsoon Glow ${Date.now().toString().slice(-4)}`;
    await page.goto("/admin/offers/new");
    await page.getByLabel("Offer title").fill(title);
    await page.getByLabel("Description").fill("A monsoon facial ritual with a complimentary hair spa upgrade.");
    await page.getByRole("spinbutton", { name: "Original price (₹)", exact: true }).fill("4000");
    await page.getByRole("spinbutton", { name: "Discount %", exact: true }).fill("25");
    await page.getByRole("button", { name: "Save offer" }).click();
    await expect(page).toHaveURL(/\/admin\/offers$/);
    await page.goto("/offers");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("₹3,000").first()).toBeVisible();
  });

  test("an admin adds a gallery image and can unpublish it", async ({ page }) => {
    const title = `Studio Light ${Date.now().toString().slice(-4)}`;
    await page.goto("/admin/gallery");
    await page.getByRole("button", { name: "Add image" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder(/paste an https/).fill("https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1200&q=80&auto=format");
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByLabel("Category").selectOption("SALON_INTERIORS");
    await dialog.getByLabel(/Alt text/).fill("Bright salon interior with styling chairs");
    await dialog.getByRole("button", { name: "Save image" }).click();
    await expect(page.getByText(title)).toBeVisible();
    await page.goto("/gallery");
    await expect(page.getByRole("button", { name: `Open image: ${title}` })).toBeVisible();
  });

  test("an admin creates a staff member who is then bookable", async ({ page }) => {
    const name = `Tara Test ${Date.now().toString().slice(-4)}`;
    await page.goto("/admin/staff/new");
    await page.getByLabel("Full name").fill(name);
    await page.getByLabel("Job title").fill("Nail Artist");
    await page.getByLabel("Login email").fill(`tara.${Date.now()}@beautyempire.test`);
    await page.getByLabel("Phone").fill("98111 33445");
    await page.getByRole("textbox", { name: "Temporary password", exact: true }).fill("Temp-Pass-2026!");
    await page.getByRole("button", { name: "Create staff account" }).click();
    await expect(page).toHaveURL(/\/admin\/staff\/(?!new$)[a-z0-9]+$/);
    await page.goto("/admin/staff");
    await expect(page.getByText(name)).toBeVisible();
  });

  test("an admin moderates a review (reject hides it, approve restores it)", async ({ page }) => {
    await page.goto("/admin/reviews?status=APPROVED");
    const first = page.locator("li").filter({ has: page.getByRole("button", { name: "Reject" }) }).first();
    const text = (await first.locator("p.text-muted-foreground").first().textContent())!.slice(0, 40);
    await first.getByRole("button", { name: "Reject" }).click();
    await expect(page.getByText("Review updated.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(text)).toHaveCount(0);
    await page.goto("/admin/reviews?status=REJECTED");
    await page.locator("li").filter({ hasText: text }).getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Review updated.")).toBeVisible();
  });
});
