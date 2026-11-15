import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email({ message: "Enter a valid email address" }));

/** Indian mobile numbers, with optional +91 / 0 prefix. Normalised to +91XXXXXXXXXX. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^(\+91|91|0)?[6-9]\d{9}$/.test(v), { message: "Enter a valid 10-digit Indian mobile number" })
  .transform((v) => `+91${v.slice(-10)}`);

export const passwordSchema = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((v) => /[a-z]/.test(v), { message: "Include at least one lowercase letter" })
  .refine((v) => /[A-Z]/.test(v), { message: "Include at least one uppercase letter" })
  .refine((v) => /\d/.test(v), { message: "Include at least one number" })
  .refine((v) => /[^A-Za-z0-9]/.test(v), { message: "Include at least one special character" });

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your full name")
  .max(120, "Name is too long")
  .refine((v) => !/[<>{}]/.test(v), { message: "Name contains invalid characters" });

/** Run the "passwords match" check even when other fields are invalid, so users see every problem at once. */
function bothStrings(a: string, b: string) {
  return (payload: { value: unknown }) => {
    const v = payload.value as Record<string, unknown> | undefined;
    return typeof v?.[a] === "string" && typeof v?.[b] === "string";
  };
}

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Please accept the terms to continue" }),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"], when: bothStrings("password", "confirmPassword") });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"], when: bothStrings("password", "confirmPassword") });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Current password is required"), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"], when: bothStrings("newPassword", "confirmPassword") });

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
