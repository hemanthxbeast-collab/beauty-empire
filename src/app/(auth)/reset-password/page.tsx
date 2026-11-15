"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/primitives";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/lib/validations/auth";
import type { z } from "zod";

type Values = z.input<typeof resetPasswordSchema>;

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const tokenError = params.get("error");
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });
  const { errors, isSubmitting } = form.formState;

  if (!token || tokenError) {
    return (
      <div>
        <h1 className="font-serif text-4xl text-charcoal">Link expired</h1>
        <p className="mt-3 text-muted-foreground">This password reset link is invalid or has expired. Please request a new one.</p>
        <Button asChild className="mt-8">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(values: Values) {
    setFormError(null);
    const { error } = await authClient.resetPassword({ newPassword: values.password, token: token! });
    if (error) {
      setFormError(error.code === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : (error.message ?? "Could not reset password."));
      return;
    }
    router.push("/login?reset=1");
  }

  return (
    <>
      <h1 className="font-serif text-4xl text-charcoal sm:text-5xl">Choose a new password</h1>
      <p className="mt-3 text-muted-foreground">For your security, you&apos;ll be signed out of other devices.</p>
      {formError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        <Field label="New password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password || undefined} {...form.register("password")} />
          <PasswordStrength value={form.watch("password") ?? ""} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" aria-invalid={!!errors.confirmPassword || undefined} {...form.register("confirmPassword")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <ResetForm />
    </Suspense>
  );
}
