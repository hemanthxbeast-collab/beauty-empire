import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck2, CheckCircle2, Clock3, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { WhatsappIcon } from "@/components/site/icons";
import { PayNowButton } from "@/components/booking/pay-now-button";
import { prisma } from "@/server/db";
import { integrations } from "@/server/env";
import { getCurrentUser } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";
import { verifyBookingAccessToken } from "@/server/services/tokens";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatInTz } from "@/lib/time";
import { formatDuration, formatINR } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Booking confirmation", robots: { index: false, follow: false } };

export default async function ConfirmationPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ reference }, { t }] = await Promise.all([params, searchParams]);
  if (!/^BE-[A-Z0-9]{8}$/.test(reference)) notFound();
  const appt = await prisma.appointment.findUnique({
    where: { reference },
    include: {
      services: { orderBy: { sortOrder: "asc" } },
      staff: { select: { title: true, user: { select: { name: true } } } },
      offer: { select: { title: true } },
    },
  });
  if (!appt) notFound();

  // Authorisation: signed link, owning customer, or admin. Otherwise behave as if it doesn't exist.
  const user = await getCurrentUser();
  const allowed =
    verifyBookingAccessToken(appt.id, t) ||
    (user?.role === "CUSTOMER" && user.customerProfileId === appt.customerId && appt.customerId !== null) ||
    user?.role === "ADMIN";
  if (!allowed) notFound();

  const settings = await getSalonSettings();
  const when = formatInTz(appt.startAt, "EEEE, d MMMM yyyy", settings.timezone);
  const time = `${formatInTz(appt.startAt, "h:mm a", settings.timezone)} – ${formatInTz(appt.endAt, "h:mm a", settings.timezone)}`;
  const duration = appt.services.reduce((s, x) => s + x.durationMinutes, 0);
  const awaitingPayment = appt.paymentMethod === "RAZORPAY" && (appt.paymentStatus === "PENDING" || appt.paymentStatus === "FAILED") && appt.status === "PENDING";
  const confirmed = appt.status === "CONFIRMED";
  const waMessage = `Hello Beauty Empire! This is about my booking ${appt.reference} on ${when} at ${formatInTz(appt.startAt, "h:mm a", settings.timezone)}.`;

  return (
    <section className="bg-ivory py-16 lg:py-24">
      <div className="container-lux max-w-3xl">
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-blush text-magenta">
            {awaitingPayment ? <Hourglass className="size-7" aria-hidden /> : <CheckCircle2 className="size-8" aria-hidden />}
          </span>
          <p className="eyebrow mt-6">Booking reference · {appt.reference}</p>
          <h1 className="heading-lg mt-3">
            {appt.status === "CANCELLED"
              ? "This booking was cancelled"
              : awaitingPayment
                ? "Complete your payment"
                : confirmed
                  ? "Your appointment is confirmed"
                  : "Thank you — booking received"}
          </h1>
          <p className="lead mx-auto mt-4 max-w-xl">
            {awaitingPayment
              ? "Your slot is held for 30 minutes. Complete the payment to secure it."
              : confirmed
                ? "We look forward to welcoming you. A confirmation email is on its way."
                : appt.status === "PENDING"
                  ? "Our team will confirm your appointment shortly. We've emailed you the details."
                  : null}
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
          <div className="grid gap-6 border-b border-border p-6 sm:grid-cols-2 sm:p-8">
            <div className="flex gap-4">
              <CalendarCheck2 className="mt-1 size-5 text-magenta" aria-hidden />
              <div>
                <p className="text-xs tracking-[0.15em] text-muted-rose uppercase">Date</p>
                <p className="mt-1 font-serif text-xl text-charcoal">{when}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock3 className="mt-1 size-5 text-magenta" aria-hidden />
              <div>
                <p className="text-xs tracking-[0.15em] text-muted-rose uppercase">Time</p>
                <p className="mt-1 font-serif text-xl text-charcoal">{time}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={confirmed ? "success" : appt.status === "PENDING" ? "warning" : "neutral"}>{APPOINTMENT_STATUS_LABELS[appt.status]}</Badge>
              <Badge variant={appt.paymentStatus === "PAID" ? "success" : appt.paymentStatus === "FAILED" ? "danger" : "outline"}>{PAYMENT_STATUS_LABELS[appt.paymentStatus]}</Badge>
              <span className="text-sm text-muted-foreground">
                with <strong className="font-medium text-charcoal">{appt.staff.user.name}</strong> · {appt.staff.title}
              </span>
            </div>
            <table className="mt-6 w-full text-sm">
              <caption className="sr-only">Price breakdown</caption>
              <tbody>
                {appt.services.map((s) => (
                  <tr key={s.id} className="border-b border-border">
                    <td className="py-3 text-charcoal">
                      {s.serviceName}
                      <span className="block text-xs text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
                    </td>
                    <td className="py-3 text-right">{formatINR(s.price, { decimals: true })}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-4 text-muted-foreground">Subtotal</td>
                  <td className="pt-4 text-right">{formatINR(appt.subtotal, { decimals: true })}</td>
                </tr>
                {appt.discount.gt(0) && (
                  <tr className="text-magenta">
                    <td className="pt-1">Discount{appt.offer ? ` · ${appt.offer.title}` : ""}</td>
                    <td className="pt-1 text-right">−{formatINR(appt.discount, { decimals: true })}</td>
                  </tr>
                )}
                <tr>
                  <td className="pt-3 font-medium text-charcoal">Total</td>
                  <td className="pt-3 text-right font-serif text-2xl text-magenta">{formatINR(appt.total, { decimals: true })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {awaitingPayment && integrations.razorpay && <PayNowButton appointmentId={appt.id} token={t} amount={formatINR(appt.total, { decimals: true })} />}
          <Button asChild variant="outline">
            <a href={whatsappLink(settings.whatsappNumber, waMessage)} target="_blank" rel="noopener noreferrer">
              <WhatsappIcon className="size-4 text-[#1f9d55]" /> Contact us on WhatsApp
            </a>
          </Button>
          {appt.customerId && user?.role === "CUSTOMER" ? (
            <Button asChild variant="secondary">
              <Link href={`/account/appointments/${appt.id}`}>Manage in my account</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link href="/register">Create an account</Link>
            </Button>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Keep this page&apos;s link private — it gives access to your booking details.</p>
      </div>
    </section>
  );
}
