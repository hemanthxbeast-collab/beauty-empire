"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { ImageUpload } from "./image-upload";
import { createStaffAction, updateStaffAction } from "@/server/actions/admin-ops";
import { staffCreateSchema, staffUpdateSchema } from "@/lib/validations/admin";
import type { z } from "zod";

type CreateValues = z.input<typeof staffCreateSchema>;
type UpdateValues = z.input<typeof staffUpdateSchema>;
type Svc = Array<{ id: string; name: string; category: string }>;

function ServicesField({ register, services }: { register: ReturnType<typeof useForm<CreateValues>>["register"] | ReturnType<typeof useForm<UpdateValues>>["register"]; services: Svc }) {
  const groups = [...new Set(services.map((s) => s.category))];
  const reg = register as unknown as (n: "serviceIds") => object;
  return (
    <fieldset className="rounded-2xl border border-border bg-white p-5">
      <legend className="px-1 text-sm font-medium text-charcoal">Services this professional performs</legend>
      <div className="mt-2 max-h-80 space-y-4 overflow-y-auto pr-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-[0.65rem] font-semibold tracking-[0.15em] text-muted-rose uppercase">{g}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {services
                .filter((s) => s.category === g)
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox value={s.id} {...reg("serviceIds")} /> {s.name}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateStaffForm({ services }: { services: Svc }) {
  const router = useRouter();
  const form = useForm<CreateValues>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", title: "", bio: "", photoUrl: "", specialties: [], yearsOfExperience: 0, serviceIds: [] },
  });
  const e = form.formState.errors;
  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[1.3fr_1fr]"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await createStaffAction(v);
        if (!res.ok) {
          for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) if (msg?.[0]) form.setError(k as keyof CreateValues, { message: msg[0] });
          return toast.error(res.error);
        }
        toast.success(res.message ?? "Created");
        router.push(`/admin/staff/${res.data.id}`);
      })}
    >
      <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="st-name" error={e.name?.message} required>
            <Input id="st-name" {...form.register("name")} />
          </Field>
          <Field label="Job title" htmlFor="st-title" error={e.title?.message} required>
            <Input id="st-title" placeholder="e.g. Senior Hair Stylist" {...form.register("title")} />
          </Field>
          <Field label="Login email" htmlFor="st-email" error={e.email?.message} required>
            <Input id="st-email" type="email" autoComplete="off" {...form.register("email")} />
          </Field>
          <Field label="Phone" htmlFor="st-phone" error={e.phone?.message} required>
            <Input id="st-phone" type="tel" {...form.register("phone")} />
          </Field>
        </div>
        <Field label="Temporary password" htmlFor="st-pw" error={e.password?.message} hint="Share securely; ask them to change it after first sign-in." required>
          <PasswordInput id="st-pw" autoComplete="new-password" {...form.register("password")} />
          <PasswordStrength value={form.watch("password") ?? ""} />
        </Field>
        <StaffProfileFields form={form as never} />
      </div>
      <div className="space-y-5">
        <ServicesField register={form.register} services={services} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Create staff account
        </Button>
      </div>
    </form>
  );
}

function StaffProfileFields({ form }: { form: ReturnType<typeof useForm<UpdateValues>> }) {
  const e = form.formState.errors;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Years of experience" htmlFor="st-years" error={e.yearsOfExperience?.message}>
          <Input id="st-years" type="number" min={0} max={60} {...form.register("yearsOfExperience")} />
        </Field>
        <Field label="Specialties" htmlFor="st-spec" hint="Comma-separated, e.g. Balayage, Keratin">
          <Controller
            control={form.control}
            name="specialties"
            render={({ field }) => (
              <Input
                id="st-spec"
                defaultValue={(field.value ?? []).join(", ")}
                onBlur={(ev) =>
                  field.onChange(
                    ev.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 12),
                  )
                }
              />
            )}
          />
        </Field>
      </div>
      <Field label="Short bio" htmlFor="st-bio" error={e.bio?.message}>
        <Textarea id="st-bio" rows={3} {...form.register("bio")} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium text-charcoal">Profile photo</p>
        <Controller control={form.control} name="photoUrl" render={({ field }) => <ImageUpload id="st-photo" folder="staff" value={field.value ?? ""} onChange={field.onChange} />} />
      </div>
    </>
  );
}

export function EditStaffForm({ defaults, services, email }: { defaults: UpdateValues; services: Svc; email: string }) {
  const router = useRouter();
  const form = useForm<UpdateValues>({ resolver: zodResolver(staffUpdateSchema), defaultValues: defaults });
  const e = form.formState.errors;
  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[1.3fr_1fr]"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await updateStaffAction(v);
        if (!res.ok) return toast.error(res.error);
        toast.success(res.message ?? "Saved");
        router.refresh();
      })}
    >
      <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="st-name" error={e.name?.message} required>
            <Input id="st-name" {...form.register("name")} />
          </Field>
          <Field label="Job title" htmlFor="st-title" error={e.title?.message} required>
            <Input id="st-title" {...form.register("title")} />
          </Field>
          <Field label="Login email" htmlFor="st-email">
            <Input id="st-email" value={email} disabled readOnly />
          </Field>
          <Field label="Phone" htmlFor="st-phone" error={e.phone?.message} required>
            <Input id="st-phone" type="tel" {...form.register("phone")} />
          </Field>
        </div>
        <StaffProfileFields form={form} />
      </div>
      <div className="space-y-5">
        <div className="space-y-3 rounded-2xl border border-border bg-white p-5">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isActive")} /> Account enabled (can sign in)
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isBookable")} /> Bookable online
          </label>
          <Field label="Display order" htmlFor="st-order">
            <Input id="st-order" type="number" min={0} {...form.register("displayOrder")} />
          </Field>
        </div>
        <ServicesField register={form.register} services={services} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save profile
        </Button>
      </div>
    </form>
  );
}
