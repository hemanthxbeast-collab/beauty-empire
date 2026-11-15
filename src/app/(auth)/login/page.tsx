import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser, homeForRole } from "@/server/session";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; unverified?: string; reset?: string; verified?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user?.emailVerified) redirect(homeForRole(user.role));
  return <LoginForm next={sp.next} notice={sp.reset ? "reset" : sp.unverified ? "unverified" : sp.verified ? "verified" : undefined} />;
}
