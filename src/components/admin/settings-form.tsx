"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, Field } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/dialog";
import { saveSettingsAction } from "@/server/actions/admin-ops";
import { settingsSchema, type SettingsInput } from "@/lib/validations/admin";
import { DAY_NAMES } from "@/lib/constants";
import type { z } from "zod";

export function SettingsForm({ defaults, razorpayConfigured }: { defaults: SettingsInput; razorpayConfigured: boolean }) {
  const router = useRouter();
  const form = useForm<SettingsInput, unknown, z.output<typeof settingsSchema>>({ resolver: zodResolver(settingsSchema), defaultValues: defaults });
  const e = form.formState.errors;
  const err = (k: keyof SettingsInput) => e[k]?.message as string | undefined;

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await saveSettingsAction(v);
        if (!res.ok) {
          for (const [k, m] of Object.entries(res.fieldErrors ?? {})) if (m?.[0]) form.setError(k as keyof SettingsInput, { message: m[0] });
          return toast.error(res.error);
        }
        toast.success(res.message ?? "Saved");
        router.refresh();
      })}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salon & contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Salon name" htmlFor="s-name" error={err("salonName")} required>
              <Input id="s-name" {...form.register("salonName")} />
            </Field>
            <Field label="Tagline" htmlFor="s-tag" error={err("tagline")}>
              <Input id="s-tag" {...form.register("tagline")} />
            </Field>
            <Field label="Address line 1" htmlFor="s-a1" error={err("addressLine1")} required className="sm:col-span-2">
              <Input id="s-a1" {...form.register("addressLine1")} />
            </Field>
            <Field label="Address line 2" htmlFor="s-a2" error={err("addressLine2")} className="sm:col-span-2">
              <Input id="s-a2" {...form.register("addressLine2")} />
            </Field>
            <Field label="City" htmlFor="s-city" error={err("city")} required>
              <Input id="s-city" {...form.register("city")} />
            </Field>
            <Field label="State" htmlFor="s-state" error={err("state")} required>
              <Input id="s-state" {...form.register("state")} />
            </Field>
            <Field label="PIN code" htmlFor="s-pin" error={err("postalCode")} required>
              <Input id="s-pin" inputMode="numeric" {...form.register("postalCode")} />
            </Field>
            <Field label="Email" htmlFor="s-email" error={err("email")} required>
              <Input id="s-email" type="email" {...form.register("email")} />
            </Field>
            <Field label="Phone" htmlFor="s-phone" error={err("phone")} required>
              <Input id="s-phone" type="tel" {...form.register("phone")} />
            </Field>
            <Field label="WhatsApp number" htmlFor="s-wa" error={err("whatsappNumber")} required>
              <Input id="s-wa" type="tel" {...form.register("whatsappNumber")} />
            </Field>
            <Field label="Google Maps embed URL" htmlFor="s-map" error={err("googleMapsEmbedUrl")} className="sm:col-span-2">
              <Input id="s-map" {...form.register("googleMapsEmbedUrl")} />
            </Field>
            <Field label="Google Maps directions link" htmlFor="s-mapl" error={err("googleMapsLink")} className="sm:col-span-2">
              <Input id="s-mapl" {...form.register("googleMapsLink")} />
            </Field>
            <Field label="Instagram URL" htmlFor="s-ig" error={err("instagramUrl")}>
              <Input id="s-ig" {...form.register("instagramUrl")} />
            </Field>
            <Field label="Facebook URL" htmlFor="s-fb" error={err("facebookUrl")}>
              <Input id="s-fb" {...form.register("facebookUrl")} />
            </Field>
            <Field label="YouTube URL" htmlFor="s-yt" error={err("youtubeUrl")}>
              <Input id="s-yt" {...form.register("youtubeUrl")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <li key={d} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="w-24 text-sm font-medium">{DAY_NAMES[d]}</span>
                  <Controller
                    control={form.control}
                    name={`businessHours.${d}.closed`}
                    render={({ field }) => <Switch checked={!field.value} onCheckedChange={(open) => field.onChange(!open)} aria-label={`Open on ${DAY_NAMES[d]}`} />}
                  />
                  {form.watch(`businessHours.${d}.closed`) ? (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input type="time" step={900} className="h-10 w-32" aria-label={`${DAY_NAMES[d]} opening`} {...form.register(`businessHours.${d}.open`)} />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input type="time" step={900} className="h-10 w-32" aria-label={`${DAY_NAMES[d]} closing`} {...form.register(`businessHours.${d}.close`)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {e.businessHours && <p className="mt-2 text-[0.8rem] text-destructive">Check the opening and closing times.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking rules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Time-slot interval" htmlFor="s-int" error={err("slotIntervalMinutes")}>
              <NativeSelect id="s-int" {...form.register("slotIntervalMinutes")}>
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    Every {m} minutes
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Minimum notice (minutes)" htmlFor="s-lead" error={err("minLeadTimeMinutes")}>
              <Input id="s-lead" type="number" min={0} {...form.register("minLeadTimeMinutes")} />
            </Field>
            <Field label="Book up to (days ahead)" htmlFor="s-adv" error={err("maxAdvanceDays")}>
              <Input id="s-adv" type="number" min={1} max={365} {...form.register("maxAdvanceDays")} />
            </Field>
            <Field label="Buffer between appointments (min)" htmlFor="s-buf" error={err("bufferMinutes")}>
              <Input id="s-buf" type="number" min={0} max={120} {...form.register("bufferMinutes")} />
            </Field>
            <Field label="Online cancellation window (hours)" htmlFor="s-cw" error={err("cancellationWindowHours")}>
              <Input id="s-cw" type="number" min={0} max={168} {...form.register("cancellationWindowHours")} />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3 sm:col-span-2">
              <span className="text-sm">
                <span className="block font-medium">Auto-confirm bookings</span>
                <span className="text-xs text-muted-foreground">Pay-at-salon bookings are confirmed instantly; otherwise they wait for approval.</span>
              </span>
              <Controller control={form.control} name="autoConfirmBookings" render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label="Auto-confirm bookings" />} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3">
              <span className="text-sm font-medium">Pay at salon</span>
              <Controller control={form.control} name="payAtSalonEnabled" render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} aria-label="Pay at salon" />} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3">
              <span className="text-sm">
                <span className="block font-medium">Online payments (Razorpay)</span>
                <span className="text-xs text-muted-foreground">
                  {razorpayConfigured ? "Keys detected in the server environment." : "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment to enable."}
                </span>
              </span>
              <Controller
                control={form.control}
                name="onlinePaymentsEnabled"
                render={({ field }) => <Switch checked={Boolean(field.value)} disabled={!razorpayConfigured} onCheckedChange={field.onChange} aria-label="Online payments" />}
              />
            </div>
            <p className="text-xs text-muted-foreground">API keys are never stored in the database or shown here — they live only in server environment variables.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Field label="Booking policy" htmlFor="s-bp" error={err("bookingPolicy")} required>
            <Textarea id="s-bp" rows={6} {...form.register("bookingPolicy")} />
          </Field>
          <Field label="Cancellation policy" htmlFor="s-cp" error={err("cancellationPolicy")} required>
            <Textarea id="s-cp" rows={6} {...form.register("cancellationPolicy")} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="shadow-lift">
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save settings
        </Button>
      </div>
    </form>
  );
}
