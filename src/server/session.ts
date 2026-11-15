import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import type { UserRole } from "@/generated/prisma/enums";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  customerProfileId: string | null;
  staffProfileId: string | null;
};

/**
 * Resolves the session cookie server-side, then loads the user fresh from the database so
 * role changes and account deactivation take effect immediately. Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      emailVerified: true,
      isActive: true,
      customerProfile: { select: { id: true } },
      staffProfile: { select: { id: true } },
    },
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    role: user.role,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    customerProfileId: user.customerProfile?.id ?? null,
    staffProfileId: user.staffProfile?.id ?? null,
  };
});

export function homeForRole(role: UserRole) {
  return role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/account";
}

// ─────────────── Page guards (redirect) ───────────────

export async function requirePageUser(nextPath: string, roles?: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!user.emailVerified) redirect(`/login?unverified=1`);
  if (roles && !roles.includes(user.role)) redirect(`/forbidden`);
  return user;
}

// ─────────────── Action / API guards (throw) ───────────────

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("Please sign in to continue.", "UNAUTHORIZED");
  if (!user.emailVerified) throw new AppError("Please verify your email address first.", "FORBIDDEN");
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AppError("You do not have permission to perform this action.", "FORBIDDEN");
  return user;
}

export const requireAdmin = () => requireRole("ADMIN");

export async function requireStaff(): Promise<CurrentUser & { staffProfileId: string }> {
  const user = await requireRole("STAFF");
  if (!user.staffProfileId) throw new AppError("Staff profile not found.", "FORBIDDEN");
  return user as CurrentUser & { staffProfileId: string };
}

export async function requireCustomer(): Promise<CurrentUser & { customerProfileId: string }> {
  const user = await requireRole("CUSTOMER");
  let profileId = user.customerProfileId;
  if (!profileId) {
    const profile = await prisma.customerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    profileId = profile.id;
  }
  return { ...user, customerProfileId: profileId };
}
