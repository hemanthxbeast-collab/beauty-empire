import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email/send";
import { resetPasswordTemplate, verifyEmailTemplate } from "@/server/email/templates";
import { passwordSchema, phoneSchema } from "@/lib/validations/auth";


export const auth = betterAuth({
  appName: "Beauty Empire",
  baseURL: process.env.BETTER_AUTH_URL ?? env.appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.appUrl],
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, resetPasswordTemplate(user.name, url));
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true, // re-send the link if an unverified user tries to sign in
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      // Links re-sent from a sign-in attempt have no destination; always continue to the role-aware dashboard.
      const link = new URL(url);
      const cb = link.searchParams.get("callbackURL");
      if (!cb || cb === "/") link.searchParams.set("callbackURL", "/dashboard");
      await sendEmail(user.email, verifyEmailTemplate(user.name, link.toString()));
    },
  },

  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
      phone: { type: "string", required: false, input: true },
      isActive: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh expiry daily on activity
    freshAge: 60 * 15,
  },

  rateLimit: {
    enabled: env.isProduction || process.env.DISABLE_RATE_LIMIT !== "true",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: Number(process.env.AUTH_SIGNIN_MAX_PER_MINUTE) || 5 },
      "/sign-up/email": { window: 600, max: 5 },
      "/request-password-reset": { window: 600, max: 3 },
      "/forget-password": { window: 600, max: 3 },
      "/reset-password": { window: 600, max: 5 },
      "/send-verification-email": { window: 600, max: 3 },
      "/change-password": { window: 600, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: env.appUrl.startsWith("https://"),
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: env.appUrl.startsWith("https://") },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Enforce our password policy and phone format on every password-setting endpoint.
      if (ctx.path === "/sign-up/email") {
        const body = ctx.body as { password?: string; phone?: string; name?: string };
        const pw = passwordSchema.safeParse(body?.password);
        if (!pw.success) throw new APIError("BAD_REQUEST", { message: pw.error.issues[0]?.message ?? "Weak password" });
        if (body?.phone) {
          const ph = phoneSchema.safeParse(body.phone);
          if (!ph.success) throw new APIError("BAD_REQUEST", { message: "Enter a valid 10-digit Indian mobile number" });
        }
        if (!body?.name || body.name.trim().length < 2 || body.name.length > 120) {
          throw new APIError("BAD_REQUEST", { message: "Please enter your full name" });
        }
      }
      if (ctx.path === "/reset-password" || ctx.path === "/change-password") {
        const body = ctx.body as { newPassword?: string };
        const pw = passwordSchema.safeParse(body?.newPassword);
        if (!pw.success) throw new APIError("BAD_REQUEST", { message: pw.error.issues[0]?.message ?? "Weak password" });
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const role = (user as { role?: string }).role ?? "CUSTOMER";
          if (role === "CUSTOMER") {
            await prisma.customerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true } });
          if (!user?.isActive) {
            throw new APIError("FORBIDDEN", { message: "This account has been disabled. Please contact the salon." });
          }
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type Auth = typeof auth;
