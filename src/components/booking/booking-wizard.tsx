"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clock, CreditCard, Loader2, Search, Sparkles, Store, Tag, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Field, Skeleton } from "@/components/ui/primitives";
import { Calendar } from "./calendar";
import { payWithRazorpay } from "./razorpay";
import { createBookingAction } from "@/server/actions/booking";
import { customerDetailsSchema } from "@/lib/validations/booking";
import { cn, formatDuration, formatINR, initials } from "@/lib/utils";
import type { z } from "zod";

type WizardService = {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  durationMinutes: number;
  imageUrl: string | null;
  staffIds: string[];
};
type WizardStaff = { id: string; name: string; title: string; photoUrl: string | null; specialties: string[]; years: number; workingDays: number[] };

export type WizardData = {
  categories: Array<{ id: string; name: string; services: WizardService[] }>;
  staff: WizardStaff[];
  closedWeekdays: number[];
  today: string;
  lastDate: string;
  payAtSalon: boolean;
  onlinePayments: boolean;
  bookingPolicy: string;
  cancellationPolicy: string;
  whatsappNumber: string;
  offer: { id: string; title: string; percent: number; serviceIds: string[] } | null;
  preselectedServiceIds: string[];
  preselectedStaffId: string | null;
  user: { name: string; email: string; phone: string } | null;
  signedInAsStaff: boolean;
};

type Slot = { minuteOfDay: number; label: string; startAt: string; staffIds: string[] };
type Details = z.input<typeof customerDetailsSchema>;

const STEPS = ["Services", "Professional", "Date", "Time", "Your details", "Payment"] as const;

export function BookingWizard({ data }: { data: WizardData }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const allServices = useMemo(() => data.categories.flatMap((c) => c.services), [data.categories]);
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>(data.preselectedServiceIds);
  const [staffId, setStaffId] = useState<string>(data.preselectedStaffId ?? "any");
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"PAY_AT_SALON" | "RAZORPAY">(data.payAtSalon ? "PAY_AT_SALON" : "RAZORPAY");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const selected = useMemo(() => serviceIds.map((id) => allServices.find((s) => s.id === id)).filter(Boolean) as WizardService[], [serviceIds, allServices]);
  const duration = selected.reduce((sum, s) => sum + s.durationMinutes, 0);
  const subtotal = selected.reduce((sum, s) => sum + s.price, 0);
  const offerBase = data.offer ? selected.filter((s) => !data.offer!.serviceIds.length || data.offer!.serviceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0) : 0;
  const discount = data.offer ? Math.round(offerBase * data.offer.percent) / 100 : 0;
  const total = subtotal - discount;

  const eligibleStaff = useMemo(
    () => data.staff.filter((st) => selected.every((s) => s.staffIds.length === 0 || s.staffIds.includes(st.id))),
    [data.staff, selected],
  );
  const chosenStaff = data.staff.find((s) => s.id === staffId) ?? null;

  // Keep the professional choice valid when services change.
  useEffect(() => {
    if (staffId !== "any" && !eligibleStaff.some((s) => s.id === staffId)) setStaffId("any");
  }, [eligibleStaff, staffId]);

  // Reset downstream choices when upstream inputs change.
  useEffect(() => {
    setSlot(null);
    setSlots(null);
  }, [serviceIds, staffId, date]);

  // Load availability for the chosen date.
  useEffect(() => {
    if (step !== 3 || !date || selected.length === 0) return;
    const ctrl = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);
    const qs = new URLSearchParams({ serviceIds: serviceIds.join(","), staffId, date });
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Could not load availability");
        setSlots(body.slots as Slot[]);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setSlotsError(e.message);
      })
      .finally(() => setSlotsLoading(false));
    return () => ctrl.abort();
  }, [step, date, serviceIds, staffId, selected.length]);

  const detailsForm = useForm<Details>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: { name: data.user?.name ?? "", email: data.user?.email ?? "", phone: data.user?.phone ?? "", notes: "", specialRequirements: "" },
  });

  const canContinue = [selected.length > 0, true, Boolean(date), Boolean(slot), Boolean(details), acceptPolicy][step];

  function toggleService(id: string) {
    setServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 6 ? (toast.error("You can book up to 6 services at once."), ids) : [...ids, id]));
  }

  function go(to: number) {
    setStep(to);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  async function submit() {
    if (!date || !slot || !details) return;
    setSubmitting(true);
    try {
      const res = await createBookingAction({
        serviceIds,
        staffId,
        date,
        minuteOfDay: slot.minuteOfDay,
        customer: details,
        paymentMethod,
        offerId: data.offer?.id,
        acceptPolicy: true,
      });
      if (!res.ok) {
        toast.error(res.error);
        if (/slot|time/i.test(res.error)) go(3);
        return;
      }
      const confirmUrl = `/book/confirmation/${res.data.reference}?t=${res.data.token}`;
      if (res.data.requiresPayment) {
        const pay = await payWithRazorpay({ appointmentId: res.data.id, token: res.data.token });
        if (pay.outcome === "PAID") toast.success("Payment verified. Thank you!");
        else if (pay.outcome === "FAILED") toast.error(pay.message ?? "Payment failed. You can retry from the confirmation page.");
        else toast("Payment not completed. You can pay from the confirmation page within 30 minutes.");
      }
      router.push(confirmUrl);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = query.trim()
    ? data.categories.map((c) => ({ ...c, services: c.services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase())) })).filter((c) => c.services.length)
    : data.categories;

  const dateLabel = date ? new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) : null;

  return (
    <div className="mt-8">
      {data.signedInAsStaff && (
        <p role="note" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You are signed in as staff/admin. This booking will be created as a guest booking using the details you enter.
        </p>
      )}
      {data.offer && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-rose bg-white px-4 py-3 text-sm text-magenta-deep">
          <Tag className="size-4" aria-hidden /> Offer applied: <strong>{data.offer.title}</strong> — {data.offer.percent}% off eligible services.
        </p>
      )}

      {/* Step indicator */}
      <nav aria-label="Booking progress">
        <ol className="flex gap-2 overflow-x-auto pb-2">
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => done && go(i)}
                  disabled={!done}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                    current && "border-magenta bg-magenta text-white",
                    done && "border-rose bg-white text-magenta-deep hover:border-magenta",
                    !done && !current && "border-border bg-white/60 text-muted-foreground",
                  )}
                >
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[0.65rem]", current ? "bg-white/20" : done ? "bg-blush" : "bg-soft-grey")}>
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {/* STEP 1 — services */}
              {step === 0 && (
                <section aria-labelledby="step-services">
                  <h2 id="step-services" className="heading-md">
                    Select your services
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">Choose one or more services — they will be scheduled back-to-back.</p>
                  <label className="relative mt-6 block">
                    <span className="sr-only">Search services</span>
                    <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-rose" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services…" className="pl-11" />
                  </label>
                  <div className="mt-8 space-y-10">
                    {filtered.map((cat) => (
                      <div key={cat.id}>
                        <h3 className="eyebrow">{cat.name}</h3>
                        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                          {cat.services.map((s) => {
                            const on = serviceIds.includes(s.id);
                            return (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => toggleService(s.id)}
                                  aria-pressed={on}
                                  className={cn(
                                    "flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left transition",
                                    on ? "border-magenta shadow-[0_0_0_3px_rgba(194,24,112,0.12)]" : "border-border hover:border-rose",
                                  )}
                                >
                                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-blush">
                                    {s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block font-medium text-charcoal">{s.name}</span>
                                    <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">{s.description}</span>
                                    <span className="mt-1.5 flex items-center gap-3 text-xs">
                                      <span className="font-semibold text-charcoal">
                                        {formatINR(s.price)}
                                        {s.originalPrice && <s className="ml-1 font-normal text-muted-foreground">{formatINR(s.originalPrice)}</s>}
                                      </span>
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="size-3" aria-hidden /> {formatDuration(s.durationMinutes)}
                                      </span>
                                    </span>
                                  </span>
                                  <span
                                    aria-hidden
                                    className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border transition", on ? "border-magenta bg-magenta text-white" : "border-input")}
                                  >
                                    {on && <Check className="size-3.5" />}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                    {filtered.length === 0 && <p className="text-sm text-muted-foreground">No services match “{query}”.</p>}
                  </div>
                </section>
              )}

              {/* STEP 2 — professional */}
              {step === 1 && (
                <section aria-labelledby="step-staff">
                  <h2 id="step-staff" className="heading-md">
                    Choose your professional
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">Showing professionals who offer all of your selected services.</p>
                  <div role="radiogroup" aria-labelledby="step-staff" className="mt-6 grid gap-3 sm:grid-cols-2">
                    <StaffOption
                      checked={staffId === "any"}
                      onSelect={() => setStaffId("any")}
                      title="No preference"
                      subtitle="We'll match you with the first available expert"
                      avatar={
                        <span className="flex size-14 items-center justify-center rounded-full bg-blush text-magenta">
                          <Users className="size-6" />
                        </span>
                      }
                    />
                    {eligibleStaff.map((st) => (
                      <StaffOption
                        key={st.id}
                        checked={staffId === st.id}
                        onSelect={() => setStaffId(st.id)}
                        title={st.name}
                        subtitle={`${st.title} · ${st.years}+ yrs`}
                        tags={st.specialties}
                        avatar={
                          st.photoUrl ? (
                            <Image src={st.photoUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                          ) : (
                            <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose/60 font-serif text-lg text-magenta-deep">
                              {initials(st.name)}
                            </span>
                          )
                        }
                      />
                    ))}
                  </div>
                  {eligibleStaff.length === 0 && (
                    <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      No single professional offers all of these services together. Choose “No preference” or book them separately.
                    </p>
                  )}
                </section>
              )}

              {/* STEP 3 — date */}
              {step === 2 && (
                <section aria-labelledby="step-date">
                  <h2 id="step-date" className="heading-md">
                    Pick a date
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {chosenStaff ? `Showing days ${chosenStaff.name.split(" ")[0]} works.` : "Showing days our professionals for these services are working."} Bookings open up to{" "}
                    {Math.round((Date.parse(data.lastDate) - Date.parse(data.today)) / 86_400_000)} days ahead.
                  </p>
                  <div className="mt-6 max-w-md">
                    <Calendar
                      value={date}
                      onChange={(d) => {
                        setDate(d);
                        go(3);
                      }}
                      minDate={data.today}
                      maxDate={data.lastDate}
                      isDisabled={(_, wd) =>
                        data.closedWeekdays.includes(wd) ||
                        // With a chosen professional, only their working days; otherwise days at least one eligible professional works.
                        (chosenStaff ? !chosenStaff.workingDays.includes(wd) : !eligibleStaff.some((s) => s.workingDays.includes(wd)))
                      }
                    />
                  </div>
                </section>
              )}

              {/* STEP 4 — time */}
              {step === 3 && (
                <section aria-labelledby="step-time">
                  <h2 id="step-time" className="heading-md">
                    Choose a time
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {dateLabel} · {formatDuration(duration)} appointment.{" "}
                    <button type="button" onClick={() => go(2)} className="text-magenta hover:underline">
                      Change date
                    </button>
                  </p>
                  <div className="mt-6" aria-live="polite" aria-busy={slotsLoading}>
                    {slotsLoading && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <Skeleton key={i} className="h-11 rounded-full" />
                        ))}
                      </div>
                    )}
                    {slotsError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{slotsError}</p>}
                    {!slotsLoading && slots && slots.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-rose bg-white px-6 py-10 text-center">
                        <p className="font-serif text-xl text-charcoal">No times available on this date</p>
                        <p className="mt-2 text-sm text-muted-foreground">Please try another date{chosenStaff ? " or choose “No preference”" : ""}.</p>
                        <Button variant="outline" className="mt-5" onClick={() => go(2)}>
                          Pick another date
                        </Button>
                      </div>
                    )}
                    {!slotsLoading && slots && slots.length > 0 && (
                      <div className="space-y-6">
                        {(
                          [
                            ["Morning", (m: number) => m < 720],
                            ["Afternoon", (m: number) => m >= 720 && m < 1020],
                            ["Evening", (m: number) => m >= 1020],
                          ] as const
                        ).map(([label, test]) => {
                          const group = slots.filter((s) => test(s.minuteOfDay));
                          if (!group.length) return null;
                          return (
                            <div key={label}>
                              <h3 className="text-xs font-semibold tracking-[0.18em] text-muted-rose uppercase">{label}</h3>
                              <div role="radiogroup" aria-label={`${label} times`} className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                                {group.map((s) => (
                                  <button
                                    key={s.minuteOfDay}
                                    type="button"
                                    role="radio"
                                    aria-checked={slot?.minuteOfDay === s.minuteOfDay}
                                    onClick={() => setSlot(s)}
                                    className={cn(
                                      "h-11 rounded-full border text-sm transition",
                                      slot?.minuteOfDay === s.minuteOfDay ? "border-magenta bg-magenta text-white" : "border-border bg-white text-charcoal hover:border-magenta hover:text-magenta",
                                    )}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* STEP 5 — details */}
              {step === 4 && (
                <section aria-labelledby="step-details">
                  <h2 id="step-details" className="heading-md">
                    Your details
                  </h2>
                  {!data.user && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <Link href="/login?next=/book" className="text-magenta hover:underline">
                        Sign in
                      </Link>{" "}
                      to manage this booking from your account, or continue as a guest.
                    </p>
                  )}
                  <form
                    id="details-form"
                    noValidate
                    className="mt-6 grid gap-5 sm:grid-cols-2"
                    onSubmit={detailsForm.handleSubmit((v) => {
                      setDetails(v);
                      go(5);
                    })}
                  >
                    <Field label="Full name" htmlFor="bk-name" error={detailsForm.formState.errors.name?.message} required>
                      <Input id="bk-name" autoComplete="name" aria-invalid={!!detailsForm.formState.errors.name || undefined} {...detailsForm.register("name")} />
                    </Field>
                    <Field label="Phone number" htmlFor="bk-phone" error={detailsForm.formState.errors.phone?.message} required>
                      <Input id="bk-phone" type="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!detailsForm.formState.errors.phone || undefined} {...detailsForm.register("phone")} />
                    </Field>
                    <Field label="Email" htmlFor="bk-email" error={detailsForm.formState.errors.email?.message} required className="sm:col-span-2">
                      <Input id="bk-email" type="email" autoComplete="email" aria-invalid={!!detailsForm.formState.errors.email || undefined} {...detailsForm.register("email")} />
                    </Field>
                    <Field label="Additional notes" htmlFor="bk-notes" error={detailsForm.formState.errors.notes?.message} hint="Anything you'd like us to know (optional)" className="sm:col-span-2">
                      <Textarea id="bk-notes" rows={3} {...detailsForm.register("notes")} />
                    </Field>
                    <Field
                      label="Special requirements"
                      htmlFor="bk-special"
                      error={detailsForm.formState.errors.specialRequirements?.message}
                      hint="Allergies, skin sensitivities, accessibility needs (optional)"
                      className="sm:col-span-2"
                    >
                      <Textarea id="bk-special" rows={3} {...detailsForm.register("specialRequirements")} />
                    </Field>
                  </form>
                </section>
              )}

              {/* STEP 6 — payment & review */}
              {step === 5 && details && (
                <section aria-labelledby="step-payment">
                  <h2 id="step-payment" className="heading-md">
                    Payment
                  </h2>
                  <div role="radiogroup" aria-labelledby="step-payment" className="mt-6 grid gap-3 sm:grid-cols-2">
                    <PaymentOption
                      checked={paymentMethod === "PAY_AT_SALON"}
                      disabled={!data.payAtSalon}
                      onSelect={() => setPaymentMethod("PAY_AT_SALON")}
                      icon={<Store className="size-5" />}
                      title="Pay at salon"
                      text={data.payAtSalon ? "Pay by cash, card or UPI after your service." : "Currently unavailable"}
                    />
                    <PaymentOption
                      checked={paymentMethod === "RAZORPAY"}
                      disabled={!data.onlinePayments}
                      onSelect={() => setPaymentMethod("RAZORPAY")}
                      icon={<CreditCard className="size-5" />}
                      title="Pay online now"
                      text={data.onlinePayments ? "UPI, cards & netbanking via Razorpay. Slot held for 30 minutes." : "Online payment is not enabled at this salon yet."}
                    />
                  </div>

                  <div className="mt-8 rounded-2xl border border-border bg-white p-6">
                    <h3 className="font-serif text-lg text-charcoal">Booking & cancellation policy</h3>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{data.bookingPolicy}</p>
                    <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{data.cancellationPolicy}</p>
                    <label className="mt-5 flex items-start gap-3 text-sm text-charcoal">
                      <Checkbox className="mt-0.5" checked={acceptPolicy} onChange={(e) => setAcceptPolicy(e.target.checked)} />I have read and accept the booking and
                      cancellation policy.
                    </label>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="sticky bottom-0 z-20 -mx-5 mt-10 flex items-center justify-between gap-3 border-t border-border bg-ivory/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-6 lg:pb-0 lg:backdrop-blur-none">
            <Button variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0 || submitting}>
              <ArrowLeft /> Back
            </Button>
            {step < 4 && step !== 2 && (
              <Button onClick={() => go(step + 1)} disabled={!canContinue}>
                Continue <ArrowRight />
              </Button>
            )}
            {step === 4 && (
              <Button type="submit" form="details-form">
                Continue <ArrowRight />
              </Button>
            )}
            {step === 5 && (
              <Button size="lg" onClick={submit} disabled={!acceptPolicy || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" /> Booking…
                  </>
                ) : paymentMethod === "RAZORPAY" ? (
                  <>
                    Confirm &amp; pay {formatINR(total)}
                  </>
                ) : (
                  <>
                    Confirm booking <Sparkles />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Summary */}
        <aside aria-label="Booking summary" className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
            <h2 className="font-serif text-xl text-charcoal">Your appointment</h2>
            {selected.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No services selected yet.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {selected.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3">
                    <span>
                      <span className="text-charcoal">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-charcoal">{formatINR(s.price)}</span>
                      {step === 0 && (
                        <button type="button" onClick={() => toggleService(s.id)} className="text-xs text-muted-rose hover:text-magenta" aria-label={`Remove ${s.name}`}>
                          ✕
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <UserRound className="size-3.5" aria-hidden /> Professional
                </dt>
                <dd className="text-right text-charcoal">{chosenStaff?.name ?? "No preference"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date & time</dt>
                <dd className="text-right text-charcoal">
                  {dateLabel ?? "—"}
                  {slot && <span className="block">{slot.label}</span>}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="text-charcoal">{duration ? formatDuration(duration) : "—"}</dd>
              </div>
            </dl>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatINR(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-magenta">
                  <dt>Offer discount</dt>
                  <dd>−{formatINR(discount, { decimals: discount % 1 !== 0 })}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-medium text-charcoal">Total</dt>
                <dd className="font-serif text-2xl text-magenta">{formatINR(total, { decimals: total % 1 !== 0 })}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[0.72rem] leading-relaxed text-muted-foreground">Prices are confirmed by the salon at booking. Final amount is calculated securely on our server.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StaffOption({ checked, onSelect, title, subtitle, tags, avatar }: { checked: boolean; onSelect: () => void; title: string; subtitle: string; tags?: string[]; avatar: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-4 rounded-2xl border bg-white p-4 text-left transition",
        checked ? "border-magenta shadow-[0_0_0_3px_rgba(194,24,112,0.12)]" : "border-border hover:border-rose",
      )}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-charcoal">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
        {tags && tags.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-ivory px-2 py-0.5 text-[0.65rem] text-charcoal/70 ring-1 ring-border">
                {t}
              </span>
            ))}
          </span>
        )}
      </span>
      <span aria-hidden className={cn("size-5 shrink-0 rounded-full border-2 transition", checked ? "border-magenta bg-magenta shadow-[inset_0_0_0_3px_white]" : "border-input")} />
    </button>
  );
}

function PaymentOption({ checked, disabled, onSelect, icon, title, text }: { checked: boolean; disabled?: boolean; onSelect: () => void; icon: React.ReactNode; title: string; text: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex items-start gap-4 rounded-2xl border bg-white p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
        checked && !disabled ? "border-magenta shadow-[0_0_0_3px_rgba(194,24,112,0.12)]" : "border-border hover:border-rose",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blush text-magenta">{icon}</span>
      <span>
        <span className="block font-medium text-charcoal">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}
