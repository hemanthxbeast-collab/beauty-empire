import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build on port 3100 backed by the TEST database.
 * Accounts are created by the real seed script with random per-run passwords (see tests/e2e/global-setup.ts).
 */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://beauty:beauty_dev_pw@localhost:5433/beauty_empire_test?schema=public";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-secret-e2e-secret-e2e-secret-0123456789",
      SALON_TIMEZONE: "Asia/Kolkata",
      DEV_MAIL_OUTBOX: "true",
      CRON_SECRET: "e2e-cron-secret",
      // The suite signs in many times from one IP; the limit stays on (see rate-limit.spec.ts).
      AUTH_SIGNIN_MAX_PER_MINUTE: "25",
    },
  },
});
