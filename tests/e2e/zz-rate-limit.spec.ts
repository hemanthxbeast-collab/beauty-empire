import { expect, test } from "@playwright/test";

// Runs last (file order) because it deliberately exhausts the sign-in limit for this IP.
test("repeated failed sign-ins are rate limited", async ({ request }) => {
  let limited = false;
  for (let i = 0; i < 40 && !limited; i++) {
    const res = await request.post("/api/auth/sign-in/email", {
      headers: { origin: "http://localhost:3100", "content-type": "application/json" },
      data: { email: "nobody@example.test", password: `Wrong-pass-${i}!A` },
    });
    if (res.status() === 429) limited = true;
    else expect(res.status()).toBe(401);
  }
  expect(limited).toBe(true);
});
