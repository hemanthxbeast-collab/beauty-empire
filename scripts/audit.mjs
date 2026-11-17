/**
 * UI audit: screenshots + horizontal-overflow check + axe WCAG 2.1 AA scan for key pages,
 * as visitor / customer / staff / admin, at 390, 768 and 1440 px.
 *
 *   node scripts/audit.mjs <label> [baseUrl]
 *
 * Reads seeded dev passwords from .env (SEED_*). Writes screenshots to
 * replica/screens/<label>/ and a JSON report to replica/audit-<label>.json.
 * Development tool only — run against a local dev server.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const label = process.argv[2] ?? "current";
const base = process.argv[3] ?? "http://localhost:3000";
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);

const ROLES = {
  visitor: null,
  customer: { email: "riya@example.test", password: env.SEED_CUSTOMER_PASSWORD },
  staff: { email: "priya@beautyempire.test", password: env.SEED_STAFF_PASSWORD },
  admin: { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
};

const PAGES = {
  visitor: ["/", "/services", "/services/hydra-facial", "/bridal", "/gallery", "/offers", "/about", "/contact", "/book", "/login", "/register", "/forgot-password", "/reset-password", "/privacy-policy", "/terms"],
  customer: ["/account", "/account/appointments", "/account/profile", "/account/reviews", "/account/notifications"],
  staff: ["/staff", "/staff/appointments", "/staff/availability", "/staff/profile"],
  admin: [
    "/admin", "/admin/bookings", "@booking-detail", "@confirmation", "/admin/services", "/admin/services/new", "/admin/services/packages/new", "/admin/categories",
    "/admin/staff", "/admin/staff/new", "/admin/customers", "/admin/customers?tab=messages", "/admin/gallery", "/admin/offers", "/admin/offers/new",
    "/admin/reviews", "/admin/payments", "/admin/settings",
  ],
};

const VIEWPORTS = { mobile: { width: 390, height: 844 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } };

const outDir = path.join("replica", "screens", label);
mkdirSync(outDir, { recursive: true });
const report = { label, base, at: new Date().toISOString(), pages: [] };

const browser = await chromium.launch();
for (const [role, creds] of Object.entries(ROLES)) {
  // Sign in once per role (the sign-in endpoint is rate limited) and reuse the session.
  let storageState;
  if (creds) {
    const ctx = await browser.newContext();
    const res = await ctx.request.post(`${base}/api/auth/sign-in/email`, { headers: { origin: base }, data: creds });
    if (!res.ok()) throw new Error(`login failed for ${role}: ${res.status()}`);
    storageState = await ctx.storageState();
    await ctx.close();
  }
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport: vp, reducedMotion: "reduce", locale: "en-IN", timezoneId: "Asia/Kolkata", storageState });
    const page = await context.newPage();
    for (const entry of PAGES[role]) {
      // "@…" entries are resolved at run time from real data (admins may open any booking / confirmation).
      let route = entry;
      if (entry.startsWith("@")) {
        await page.goto(base + "/admin/bookings", { waitUntil: "networkidle" });
        const link = page.locator('a[href^="/admin/bookings/"]').first();
        route = entry === "@booking-detail" ? await link.getAttribute("href") : `/book/confirmation/${(await link.textContent()).trim()}`;
      }
      const res = await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const name = `${role}${route === "/" ? "_home" : route.replace(/[^a-z0-9]+/gi, "_")}-${vpName}.png`;
      await page.screenshot({ path: path.join(outDir, name), fullPage: vpName !== "desktop" ? false : true });
      let violations = [];
      {
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        violations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help, sample: v.nodes[0]?.target?.join(" ") }));
      }
      report.pages.push({ role, viewport: vpName, route, status: res?.status(), overflow, violations });
      console.log(`${role.padEnd(8)} ${vpName.padEnd(7)} ${route.padEnd(28)} ${res?.status()} overflow=${overflow} axe=${violations.reduce((s, v) => s + v.count, 0)}`);
    }
    await context.close();
  }
}
await browser.close();

const summary = {};
for (const p of report.pages) for (const v of p.violations) {
  summary[v.id] ??= { impact: v.impact, help: v.help, nodes: 0, pages: new Set() };
  summary[v.id].nodes += v.count;
  summary[v.id].pages.add(`${p.route}@${p.viewport}`);
}
report.summary = Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, { ...v, pages: [...v.pages] }]));
report.totals = {
  pageLoads: report.pages.length,
  axeScans: report.pages.length,
  axeNodes: report.pages.reduce((s, p) => s + p.violations.reduce((a, v) => a + v.count, 0), 0),
  overflowPages: report.pages.filter((p) => p.overflow > 1).map((p) => `${p.route}@${p.viewport}`),
  non200: report.pages.filter((p) => p.status !== 200).map((p) => `${p.route}@${p.viewport}:${p.status}`),
};
writeFileSync(path.join("replica", `audit-${label}.json`), JSON.stringify(report, null, 2));
console.log("\nTOTALS", JSON.stringify(report.totals, null, 2));
console.log("AXE RULES", Object.entries(report.summary).map(([k, v]) => `${k}(${v.impact}) x${v.nodes}`).join(", "));
