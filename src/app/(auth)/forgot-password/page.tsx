"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import type { z } from "zod";

type Values = z.input<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: Values) {
    setFormError(null);
    const { error } = await authClient.requestPasswordReset({ email: values.email.trim().toLowerCase(), redirectTo: "/reset-password" });
    // Always show the same message so the form cannot be used to discover registered emails.
    if (error?.status === 429) {
      setFormError("Too many requests. Please wait a few minutes and try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-blush text-magenta">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 font-serif text-4xl text-charcoal">Check your email</h1>
        <p className="mt-3 text-muted-foreground">If an account exists for that address, you&apos;ll receive a password reset link valid for 1 hour.</p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
      <h1 className="mt-6 font-serif text-4xl text-charcoal sm:text-5xl">Forgot password?</h1>
      <p className="mt-3 text-muted-foreground">Enter your email and we&apos;ll send you a secure link to reset your password.</p>
      {formError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email || undefined} {...form.register("email")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </>
  );
}
