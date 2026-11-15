"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { updateProfileAction } from "@/server/actions/account";
import { authClient } from "@/lib/auth-client";
import { profileSchema, type ProfileInput } from "@/lib/validations/booking";
import { changePasswordSchema } from "@/lib/validations/auth";
import type { z } from "zod";

export function ProfileForm({ defaults, email, staff }: { defaults: ProfileInput; email: string; staff: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await updateProfileAction(values);
        if (res.ok) {
          toast.success(res.message ?? "Saved");
          router.refresh();
        } else {
          for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) form.setError(k as keyof ProfileInput, { message: v[0] });
          toast.error(res.error);
        }
      })}
    >
      <Field label="Full name" htmlFor="pf-name" error={errors.name?.message} required>
        <Input id="pf-name" autoComplete="name" {...form.register("name")} />
      </Field>
      <Field label="Email" htmlFor="pf-email" hint="Contact the salon to change your email.">
        <Input id="pf-email" value={email} disabled readOnly />
      </Field>
      <Field label="Phone" htmlFor="pf-phone" error={errors.phone?.message} required>
        <Input id="pf-phone" type="tel" autoComplete="tel" {...form.register("phone")} />
      </Field>
      <Field label="Date of birth (optional)" htmlFor="pf-dob" error={errors.dateOfBirth?.message} hint="We'll send you a birthday treat.">
        <Input id="pf-dob" type="date" {...form.register("dateOfBirth")} />
      </Field>
      <Field label="Skin type" htmlFor="pf-skin" error={errors.skinType?.message}>
        <NativeSelect id="pf-skin" {...form.register("skinType")}>
          <option value="">Prefer not to say</option>
          {["Normal", "Dry", "Oily", "Combination", "Sensitive"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Hair type" htmlFor="pf-hair" error={errors.hairType?.message}>
        <NativeSelect id="pf-hair" {...form.register("hairType")}>
          <option value="">Prefer not to say</option>
          {["Straight", "Wavy", "Curly", "Coily", "Colour-treated"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Preferred professional" htmlFor="pf-staff" className="sm:col-span-2">
        <NativeSelect id="pf-staff" {...form.register("preferredStaffId")}>
          <option value="none">No preference</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Saved preferences" htmlFor="pf-prefs" error={errors.preferences?.message} hint="Allergies, product preferences, favourite styles…" className="sm:col-span-2">
        <Textarea id="pf-prefs" rows={4} {...form.register("preferences")} />
      </Field>
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <Checkbox {...form.register("marketingOptIn")} /> Send me occasional offers and beauty tips by email
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </div>
    </form>
  );
}

type PwValues = z.input<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PwValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit(async (v) => {
        setError(null);
        const { error: e } = await authClient.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword, revokeOtherSessions: true });
        if (e) {
          setError(e.code === "INVALID_PASSWORD" ? "Your current password is incorrect." : (e.message ?? "Could not change password."));
          return;
        }
        form.reset();
        toast.success("Password changed. Other devices have been signed out.");
      })}
    >
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <Field label="Current password" htmlFor="pw-current" error={errors.currentPassword?.message}>
        <PasswordInput id="pw-current" autoComplete="current-password" {...form.register("currentPassword")} />
      </Field>
      <Field label="New password" htmlFor="pw-new" error={errors.newPassword?.message}>
        <PasswordInput id="pw-new" autoComplete="new-password" {...form.register("newPassword")} />
        <PasswordStrength value={form.watch("newPassword") ?? ""} />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirmPassword?.message}>
        <PasswordInput id="pw-confirm" autoComplete="new-password" {...form.register("confirmPassword")} />
      </Field>
      <Button type="submit" variant="dark" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" />} Change password
      </Button>
    </form>
  );
}
