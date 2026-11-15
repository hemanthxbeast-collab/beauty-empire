"use client";

/**
 * Admin forms for packages, categories, offers and gallery images. Each validates on the client
 * with the same Zod schema the server action re-validates with.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "./image-upload";
import { saveCategoryAction, saveGalleryImageAction, saveOfferAction, savePackageAction } from "@/server/actions/admin-catalog";
import { categorySchema, galleryImageSchema, offerSchema, packageSchema } from "@/lib/validations/admin";
import { GALLERY_CATEGORY_LABELS } from "@/lib/constants";
import type { ActionResult } from "@/server/errors";
import type { z } from "zod";

function useSubmit<T extends FieldValues>(form: UseFormReturn<T>, action: (v: T) => Promise<ActionResult<unknown>>, onDone: () => void) {
  return form.handleSubmit(async (values) => {
    const res = await action(values);
    if (!res.ok) {
      for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) form.setError(k as Path<T>, { message: v[0] });
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Saved");
    onDone();
  });
}

function ServicePicker<T extends FieldValues>({ form, name, services, legend }: { form: UseFormReturn<T>; name: Path<T>; services: Array<{ id: string; name: string; category: string }>; legend: string }) {
  const groups = [...new Set(services.map((s) => s.category))];
  return (
    <fieldset className="rounded-2xl border border-border p-4">
      <legend className="px-1 text-sm font-medium text-charcoal">{legend}</legend>
      <div className="mt-2 max-h-72 space-y-4 overflow-y-auto pr-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-[0.65rem] font-semibold tracking-[0.15em] text-muted-rose uppercase">{g}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {services
                .filter((s) => s.category === g)
                .map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox value={s.id} {...form.register(name)} /> {s.name}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

// ───────────── Package ─────────────
type PackageValues = z.input<typeof packageSchema>;
export function PackageForm({ defaults, services }: { defaults: PackageValues; services: Array<{ id: string; name: string; category: string }> }) {
  const router = useRouter();
  const form = useForm<PackageValues>({ resolver: zodResolver(packageSchema), defaultValues: defaults });
  const e = form.formState.errors;
  const submit = useSubmit(form, savePackageAction, () => {
    router.push("/admin/services");
    router.refresh();
  });
  return (
    <form noValidate onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Package name" htmlFor="pk-name" error={e.name?.message} required>
            <Input id="pk-name" {...form.register("name")} />
          </Field>
          <Field label="Package price (₹)" htmlFor="pk-price" error={e.price?.message} required>
            <Input id="pk-price" type="number" min={0} {...form.register("price")} />
          </Field>
        </div>
        <Field label="Description" htmlFor="pk-desc" error={e.description?.message} required>
          <Textarea id="pk-desc" rows={4} {...form.register("description")} />
        </Field>
        <ServicePicker form={form} name="serviceIds" services={services} legend="Included services" />
        {e.serviceIds && <p className="text-[0.8rem] text-destructive">{e.serviceIds.message}</p>}
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-white p-6">
          <Controller control={form.control} name="imageUrl" render={({ field }) => <ImageUpload id="pk-img" folder="packages" value={field.value ?? ""} onChange={field.onChange} />} />
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-white p-6">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isActive")} /> Visible on website
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isBridal")} /> Bridal package
          </label>
          <Field label="Display order" htmlFor="pk-order">
            <Input id="pk-order" type="number" min={0} {...form.register("displayOrder")} />
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save package
        </Button>
      </div>
    </form>
  );
}

// ───────────── Category (dialog) ─────────────
type CategoryValues = z.input<typeof categorySchema>;
export function CategoryDialog({ defaults, trigger }: { defaults?: CategoryValues; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaults ?? { name: "", slug: "", description: "", imageUrl: "", displayOrder: 0, isActive: true },
  });
  const e = form.formState.errors;
  const submit = useSubmit(form, saveCategoryAction, () => {
    setOpen(false);
    if (!defaults) form.reset();
    router.refresh();
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{defaults ? "Edit category" : "New category"}</DialogTitle>
        <form noValidate onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Name" htmlFor="ct-name" error={e.name?.message} required>
            <Input id="ct-name" {...form.register("name")} />
          </Field>
          <Field label="Description" htmlFor="ct-desc" error={e.description?.message}>
            <Textarea id="ct-desc" rows={3} {...form.register("description")} />
          </Field>
          <Controller control={form.control} name="imageUrl" render={({ field }) => <ImageUpload id="ct-img" folder="categories" value={field.value ?? ""} onChange={field.onChange} />} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug" htmlFor="ct-slug" error={e.slug?.message} hint="Auto if blank">
              <Input id="ct-slug" {...form.register("slug")} />
            </Field>
            <Field label="Display order" htmlFor="ct-order">
              <Input id="ct-order" type="number" min={0} {...form.register("displayOrder")} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isActive")} /> Active (visible on website)
          </label>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save category
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ───────────── Offer ─────────────
type OfferValues = z.input<typeof offerSchema>;
export function OfferForm({ defaults, services }: { defaults: OfferValues; services: Array<{ id: string; name: string; category: string }> }) {
  const router = useRouter();
  const form = useForm<OfferValues>({ resolver: zodResolver(offerSchema), defaultValues: defaults });
  const e = form.formState.errors;
  const original = Number(form.watch("originalPrice")) || 0;
  const pct = Number(form.watch("discountPercent")) || 0;
  const submit = useSubmit(form, saveOfferAction, () => {
    router.push("/admin/offers");
    router.refresh();
  });
  return (
    <form noValidate onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-white p-6">
        <Field label="Offer title" htmlFor="of-title" error={e.title?.message} required>
          <Input id="of-title" {...form.register("title")} />
        </Field>
        <Field label="Description" htmlFor="of-desc" error={e.description?.message} required>
          <Textarea id="of-desc" rows={3} {...form.register("description")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Original price (₹)" htmlFor="of-orig" error={e.originalPrice?.message} required>
            <Input id="of-orig" type="number" min={0} {...form.register("originalPrice")} />
          </Field>
          <Field label="Discount %" htmlFor="of-pct" error={e.discountPercent?.message} required>
            <Input id="of-pct" type="number" min={1} max={90} {...form.register("discountPercent")} />
          </Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-charcoal">Offer price</p>
            <p className="flex h-12 items-center rounded-xl bg-blush/60 px-4 font-serif text-xl text-magenta">₹{(Math.round(original * (100 - pct)) / 100).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Valid from" htmlFor="of-from" error={e.validFrom?.message} required>
            <Input id="of-from" type="date" {...form.register("validFrom")} />
          </Field>
          <Field label="Valid until" htmlFor="of-until" error={e.validUntil?.message} required>
            <Input id="of-until" type="date" {...form.register("validUntil")} />
          </Field>
        </div>
        <Field label="Terms (optional)" htmlFor="of-terms" error={e.terms?.message}>
          <Textarea id="of-terms" rows={2} {...form.register("terms")} />
        </Field>
        <ServicePicker form={form} name="serviceIds" services={services} legend="Services the discount applies to (none = all services in the booking)" />
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-white p-6">
          <Controller control={form.control} name="imageUrl" render={({ field }) => <ImageUpload id="of-img" folder="offers" value={field.value ?? ""} onChange={field.onChange} />} />
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-white p-6">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox {...form.register("isActive")} /> Active
          </label>
          <Field label="Display order" htmlFor="of-order">
            <Input id="of-order" type="number" min={0} {...form.register("displayOrder")} />
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save offer
        </Button>
      </div>
    </form>
  );
}

// ───────────── Gallery image (dialog) ─────────────
type GalleryValues = z.input<typeof galleryImageSchema>;
export function GalleryDialog({ defaults, trigger }: { defaults?: GalleryValues; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<GalleryValues>({
    resolver: zodResolver(galleryImageSchema),
    defaultValues: defaults ?? { title: "", description: "", altText: "", imageUrl: "", category: "BRIDAL_MAKEUP", isPublished: true, showOnInstagram: false, displayOrder: 0 },
  });
  const e = form.formState.errors;
  const submit = useSubmit(form, saveGalleryImageAction, () => {
    setOpen(false);
    if (!defaults) form.reset();
    router.refresh();
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogTitle>{defaults ? "Edit image" : "Add gallery image"}</DialogTitle>
        <form noValidate onSubmit={submit} className="mt-6 space-y-4">
          <Controller control={form.control} name="imageUrl" render={({ field }) => <ImageUpload id="gl-img" folder="gallery" value={field.value ?? ""} onChange={field.onChange} />} />
          {e.imageUrl && <p className="text-[0.8rem] text-destructive">{e.imageUrl.message}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="gl-title" error={e.title?.message} required>
              <Input id="gl-title" {...form.register("title")} />
            </Field>
            <Field label="Category" htmlFor="gl-cat" error={e.category?.message} required>
              <NativeSelect id="gl-cat" {...form.register("category")}>
                {Object.entries(GALLERY_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Alt text (for screen readers)" htmlFor="gl-alt" error={e.altText?.message} required>
            <Input id="gl-alt" {...form.register("altText")} />
          </Field>
          <Field label="Description" htmlFor="gl-desc" error={e.description?.message}>
            <Input id="gl-desc" {...form.register("description")} />
          </Field>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...form.register("isPublished")} /> Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...form.register("showOnInstagram")} /> Show in Instagram grid
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save image
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
