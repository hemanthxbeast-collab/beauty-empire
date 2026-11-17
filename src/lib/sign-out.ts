"use client";

/** Signs out via Better Auth's endpoint without pulling the auth client SDK into every page. */
export async function signOut() {
  await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "same-origin" });
}
