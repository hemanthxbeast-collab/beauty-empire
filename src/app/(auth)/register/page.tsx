"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "", acceptTerms: false as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;
  const password = form.watch("password") ?? "";

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    const parsed = registerSchema.parse(values);
    const { error } = await authClient.signUp.email({
      name: parsed.name,
      email: parsed.email,
      password: parsed.password,
      phone: parsed.phone,
      callbackURL: "/dashboard",
    });
    if (error) {
      if (error.status === 429) setFormError("Too many attempts. Please wait a few minutes and try again.");
      else if (error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") setFormError("An account with this email already exists. Try signing in instead.");
      else setFormError(error.message ?? "Unable to create your account.");
      return;
    }
    setSentTo(parsed.email);
  }

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-blush text-magenta">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 font-serif text-4xl text-charcoal">Check your inbox</h1>
        <p className="mt-3 text-muted-foreground">
          We&apos;ve sent a verification link to <strong className="text-charcoal">{sentTo}</strong>. Click the link to activate your account — it
          expires in 24 hours.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Join Beauty Empire</p>
      <h1 className="mt-3 font-serif text-4xl text-charcoal sm:text-5xl">Create your account</h1>
      <p className="mt-3 text-muted-foreground">Book faster, manage appointments and save your beauty preferences.</p>
      {formError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" aria-invalid={!!errors.name || undefined} {...form.register("name")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email || undefined} {...form.register("email")} />
          </Field>
          <Field label="Phone number" htmlFor="phone" error={errors.phone?.message} required>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone || undefined} {...form.register("phone")} />
          </Field>
        </div>
        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password || undefined} {...form.register("password")} />
          <PasswordStrength value={password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword || undefined} {...form.register("confirmPassword")} />
        </Field>
        <div>
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox className="mt-0.5" {...form.register("acceptTerms")} aria-invalid={!!errors.acceptTerms || undefined} />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="text-magenta hover:underline" target="_blank">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="text-magenta hover:underline" target="_blank">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms && (
            <p role="alert" className="mt-1.5 text-[0.8rem] text-destructive">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-magenta hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
