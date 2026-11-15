import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "../../playwright.config";

export const CREDENTIALS_FILE = path.join(process.cwd(), "test-results", ".e2e-credentials.json");

const pw = (prefix: string) => `${prefix}-${randomBytes(9).toString("base64url")}9!aA`;

/** Fresh test database + seeded accounts with random per-run passwords (never committed). */
export default async function globalSetup() {
  if (!/test/i.test(new URL(TEST_DATABASE_URL).pathname)) throw new Error("E2E must use a test database");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } });

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'");
  await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.end();

  const creds = {
    admin: { email: "admin@beautyempire.test", password: pw("Adm") },
    staff: { email: "priya@beautyempire.test", password: pw("Stf") },
    customer: { email: "riya@example.test", password: pw("Cst") },
    otherCustomer: { email: "aisha@example.test" },
  };
  execSync("npx tsx prisma/seed.ts", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      SEED_ADMIN_EMAIL: creds.admin.email,
      SEED_ADMIN_PASSWORD: creds.admin.password,
      SEED_STAFF_PASSWORD: creds.staff.password,
      SEED_CUSTOMER_PASSWORD: creds.customer.password,
      SEED_DEMO_DATA: "true",
    },
  });
  mkdirSync(path.dirname(CREDENTIALS_FILE), { recursive: true });
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds));
}
