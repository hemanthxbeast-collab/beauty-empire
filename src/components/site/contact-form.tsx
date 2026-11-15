"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { contactSchema, type ContactInput } from "@/lib/validations/booking";
import { submitContactMessage } from "@/server/actions/public";

export function ContactForm({ defaultSubject }: { defaultSubject?: string }) {
  const [sent, setSent] = useState(false);
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", subject: defaultSubject ?? "", message: "", company: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: ContactInput) {
    const res = await submitContactMessage(values);
    if (!res.ok) {
      if (res.fieldErrors) {
        for (const [k, v] of Object.entries(res.fieldErrors)) if (v?.[0]) form.setError(k as keyof ContactInput, { message: v[0] });
      }
      toast.error(res.error);
      return;
    }
    setSent(true);
    form.reset();
    toast.success(res.message ?? "Message sent");
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl bg-blush/60 px-6 py-14 text-center">
        <CheckCircle2 className="size-10 text-magenta" aria-hidden />
        <h3 className="mt-4 font-serif text-2xl text-charcoal">Message received</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Thank you for reaching out. Our team will reply within one business day.</p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  const aria = (name: keyof ContactInput) => ({ "aria-invalid": Boolean(errors[name]) || undefined, "aria-describedby": errors[name] ? `contact-${name}-error` : undefined });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name" htmlFor="contact-name" error={errors.name?.message} required>
        <Input id="contact-name" autoComplete="name" {...form.register("name")} {...aria("name")} />
      </Field>
      <Field label="Email" htmlFor="contact-email" error={errors.email?.message} required>
        <Input id="contact-email" type="email" autoComplete="email" {...form.register("email")} {...aria("email")} />
      </Field>
      <Field label="Phone (optional)" htmlFor="contact-phone" error={errors.phone?.message}>
        <Input id="contact-phone" type="tel" autoComplete="tel" placeholder="98765 43210" {...form.register("phone")} {...aria("phone")} />
      </Field>
      <Field label="Subject" htmlFor="contact-subject" error={errors.subject?.message} required>
        <Input id="contact-subject" {...form.register("subject")} {...aria("subject")} />
      </Field>
      <Field label="Message" htmlFor="contact-message" error={errors.message?.message} required className="sm:col-span-2">
        <Textarea id="contact-message" rows={5} {...form.register("message")} {...aria("message")} />
      </Field>
      {/* Honeypot: hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" tabIndex={-1} autoComplete="off" {...form.register("company")} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Sending…" : (
            <>
              Send Message <Send />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
