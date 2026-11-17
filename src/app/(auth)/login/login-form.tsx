"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient, safeNext } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({ next, notice }: { next?: string; notice?: "reset" | "unverified" | "verified" }) {
  const router = useRouter();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const { error } = await authClient.signIn.email({ email: values.email.trim().toLowerCase(), password: values.password });
    if (error) {
      if (error.status === 403 || error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email);
        return;
      }
      if (error.status === 429) {
        setFormError("Too many sign-in attempts. Please wait a minute and try again.");
        return;
      }
      setFormError(error.code === "INVALID_EMAIL_OR_PASSWORD" ? "Incorrect email or password." : (error.message ?? "Unable to sign in."));
      return;
    }
    router.push(safeNext(next));
    router.refresh();
  }

  async function resend() {
    if (!unverifiedEmail) return;
    const { error } = await authClient.sendVerificationEmail({ email: unverifiedEmail, callbackURL: "/dashboard" });
    if (error) toast.error(error.status === 429 ? "Please wait before requesting another email." : "Could not send email. Try again shortly.");
    else toast.success("Verification email sent. Please check your inbox.");
  }

  if (unverifiedEmail) {
    return (
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-blush text-magenta">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 font-serif text-4xl text-charcoal">Verify your email</h1>
        <p className="mt-3 text-muted-foreground">
          We&apos;ve sent a verification link to <strong className="text-charcoal">{unverifiedEmail}</strong>. Please verify your email to sign in.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={resend}>Resend verification email</Button>
          <Button variant="ghost" onClick={() => setUnverifiedEmail(null)}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-3 font-serif text-4xl text-charcoal sm:text-5xl">Sign in</h1>
      <p className="mt-3 text-muted-foreground">Manage your appointments, profile and reviews.</p>

      {notice && (
        <p role="status" className="mt-6 rounded-xl bg-blush/70 px-4 py-3 text-sm text-magenta-deep">
          {notice === "reset" && "Your password has been reset. Please sign in with your new password."}
          {notice === "unverified" && "Please verify your email address before continuing. Sign in to resend the link."}
          {notice === "verified" && "Your email is verified. Please sign in."}
        </p>
      )}
      {formError && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email || undefined} {...form.register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password || undefined} {...form.register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="link-inline text-sm">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Beauty Empire?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-inline font-medium">
          Create an account
        </Link>
      </p>
    </>
  );
}
