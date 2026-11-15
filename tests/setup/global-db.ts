import { execSync } from "node:child_process";
import { Client } from "pg";

const url = process.env.TEST_DATABASE_URL ?? "postgresql://beauty:beauty_dev_pw@localhost:5433/beauty_empire_test?schema=public";

/** Applies migrations to the test database once per run and wipes all data. */
export default async function setup() {
  if (!/test/i.test(new URL(url).pathname)) throw new Error(`Refusing to run integration tests against a non-test database: ${url}`);
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'");
  if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.end();
}
