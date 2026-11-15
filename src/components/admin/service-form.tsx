"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { ImageUpload } from "./image-upload";
import { saveServiceAction } from "@/server/actions/admin-catalog";
import { serviceSchema, type ServiceFormInput } from "@/lib/validations/admin";
import type { z } from "zod";

export function ServiceForm({
  defaults,
  categories,
  staff,
}: {
  defaults: ServiceFormInput;
  categories: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; name: string; title: string }>;
}) {
  const router = useRouter();
  const form = useForm<ServiceFormInput, unknown, z.output<typeof serviceSchema>>({ resolver: zodResolver(serviceSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;
  const err = (k: keyof ServiceFormInput) => errors[k]?.message as string | undefined;

  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[1.5fr_1fr]"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await saveServiceAction(values);
        if (!res.ok) {
          for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) form.setError(k as keyof ServiceFormInput, { message: v[0] });
          toast.error(res.error);
          return;
        }
        toast.success(res.message ?? "Saved");
        router.push("/admin/services");
        router.refresh();
      })}
    >
      <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Service name" htmlFor="sv-name" error={err("name")} required>
            <Input id="sv-name" {...form.register("name")} />
          </Field>
          <Field label="Category" htmlFor="sv-cat" error={err("categoryId")} required>
            <NativeSelect id="sv-cat" {...form.register("categoryId")}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Short description" htmlFor="sv-short" error={err("shortDescription")} hint="Shown on service cards (max 240 characters)" required>
          <Input id="sv-short" maxLength={240} {...form.register("shortDescription")} />
        </Field>
        <Field label="Full description" htmlFor="sv-desc" error={err("description")} hint="Separate paragraphs with a blank line" required>
          <Textarea id="sv-desc" rows={7} {...form.register("description")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price (₹)" htmlFor="sv-price" error={err("price")} required>
            <Input id="sv-price" type="number" min={0} step="1" inputMode="decimal" {...form.register("price")} />
          </Field>
          <Field label="Discount price (₹)" htmlFor="sv-disc" error={err("discountPrice")} hint="Optional">
            <Input id="sv-disc" type="number" min={0} step="1" inputMode="decimal" {...form.register("discountPrice")} />
          </Field>
          <Field label="Duration (minutes)" htmlFor="sv-dur" error={err("durationMinutes")} required>
            <Input id="sv-dur" type="number" min={5} max={720} step={5} {...form.register("durationMinutes")} />
          </Field>
        </div>
        <Field label="URL slug" htmlFor="sv-slug" error={err("slug")} hint="Leave blank to generate from the name">
          <Input id="sv-slug" {...form.register("slug")} />
        </Field>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-white p-6">
          <p className="mb-3 text-sm font-medium text-charcoal">Service image</p>
          <Controller control={form.control} name="imageUrl" render={({ field }) => <ImageUpload id="sv-image" folder="services" value={field.value ?? ""} onChange={field.onChange} />} />
          {err("imageUrl") && <p className="mt-2 text-[0.8rem] text-destructive">{err("imageUrl")}</p>}
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-white p-6">
          <Field label="Status" htmlFor="sv-status">
            <NativeSelect id="sv-status" {...form.register("status")}>
              <option value="ACTIVE">Active — visible & bookable</option>
              <option value="INACTIVE">Inactive — hidden</option>
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isFeatured")} /> Feature on home page
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isBridal")} /> Show in Bridal Studio
          </label>
          <Field label="Display order" htmlFor="sv-order" error={err("displayOrder")}>
            <Input id="sv-order" type="number" min={0} max={999} {...form.register("displayOrder")} />
          </Field>
        </div>
        <fieldset className="rounded-2xl border border-border bg-white p-6">
          <legend className="px-1 text-sm font-medium text-charcoal">Professionals who perform this service</legend>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">If none are selected, any professional can be booked for it.</p>
          <div className="space-y-2">
            {staff.map((s) => (
              <label key={s.id} className="flex items-center gap-3 text-sm">
                <Checkbox value={s.id} {...form.register("staffIds")} />
                <span>
                  {s.name} <span className="text-xs text-muted-foreground">· {s.title}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Save service
        </Button>
      </div>
    </form>
  );
}
