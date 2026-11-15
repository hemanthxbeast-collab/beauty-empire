import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { CancelBookingButton, RescheduleButton, ReviewForm } from "@/components/account/booking-actions";
import { PayNowButton } from "@/components/booking/pay-now-button";
import { WhatsappIcon } from "@/components/site/icons";
import { requireCustomer } from "@/server/session";
import { getCustomerAppointment } from "@/server/queries/account";
import { getSalonSettings } from "@/server/services/settings";
import { integrations } from "@/server/env";
import { canCustomerCancel } from "@/lib/booking/slots";
import { addDaysToDateKey, dateKeyInTz, formatInTz } from "@/lib/time";
import { formatDuration, formatINR } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Appointment details" };

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCustomer();
  const [appt, settings] = await Promise.all([getCustomerAppointment(user.customerProfileId, id), getSalonSettings()]);
  if (!appt) notFound();

  const tz = settings.timezone;
  const policy = canCustomerCancel({ status: appt.status, startAt: appt.startAt, now: new Date(), cancellationWindowHours: settings.cancellationWindowHours });
  const active = appt.status === "PENDING" || appt.status === "CONFIRMED";
  const today = dateKeyInTz(new Date(), tz);
  const awaitingPayment = appt.paymentMethod === "RAZORPAY" && appt.status === "PENDING" && (appt.paymentStatus === "PENDING" || appt.paymentStatus === "FAILED");

  return (
    <>
      <Link href="/account/appointments" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> My appointments
      </Link>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs text-muted-rose">{appt.reference}</p>
          <h1 className="mt-1 font-serif text-3xl text-charcoal sm:text-4xl">{formatInTz(appt.startAt, "EEEE, d MMMM yyyy", tz)}</h1>
          <p className="mt-1 text-muted-foreground">
            {formatInTz(appt.startAt, "h:mm a", tz)} – {formatInTz(appt.endAt, "h:mm a", tz)} · with {appt.staff.user.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={appt.status} />
          <PaymentBadge status={appt.paymentStatus} />
          {appt.rescheduleRequestedStartAt && <Badge variant="info">Reschedule requested: {formatInTz(appt.rescheduleRequestedStartAt, "d MMM, h:mm a", tz)}</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Services & price</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {appt.services.map((s) => (
                  <tr key={s.id} className="border-b border-border">
                    <td className="py-3">
                      <Link href={`/services/${s.service.slug}`} className="text-charcoal hover:text-magenta">
                        {s.serviceName}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
                    </td>
                    <td className="py-3 text-right">{formatINR(s.price, { decimals: true })}</td>
                  </tr>
                ))}
                {appt.discount.gt(0) && (
                  <tr className="text-magenta">
                    <td className="pt-3">Discount{appt.offer ? ` · ${appt.offer.title}` : ""}</td>
                    <td className="pt-3 text-right">−{formatINR(appt.discount, { decimals: true })}</td>
                  </tr>
                )}
                <tr>
                  <td className="pt-3 font-medium">Total</td>
                  <td className="pt-3 text-right font-serif text-2xl text-magenta">{formatINR(appt.total, { decimals: true })}</td>
                </tr>
              </tbody>
            </table>
            {(appt.notes || appt.specialRequirements) && (
              <dl className="mt-6 space-y-3 rounded-xl bg-ivory p-4 text-sm">
                {appt.notes && (
                  <div>
                    <dt className="text-xs text-muted-rose">Notes</dt>
                    <dd className="whitespace-pre-line">{appt.notes}</dd>
                  </div>
                )}
                {appt.specialRequirements && (
                  <div>
                    <dt className="text-xs text-muted-rose">Special requirements</dt>
                    <dd className="whitespace-pre-line">{appt.specialRequirements}</dd>
                  </div>
                )}
              </dl>
            )}
            {appt.cancellationReason && <p className="mt-4 text-sm text-muted-foreground">Cancellation note: {appt.cancellationReason}</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {awaitingPayment && integrations.razorpay && <PayNowButton appointmentId={appt.id} amount={formatINR(appt.total, { decimals: true })} />}
              {active && policy.allowed && (
                <>
                  <RescheduleButton
                    appointmentId={appt.id}
                    serviceIds={appt.services.map((s) => s.serviceId)}
                    staffId={appt.staff.id}
                    today={today}
                    lastDate={addDaysToDateKey(today, settings.maxAdvanceDays)}
                    closedWeekdays={Object.entries(settings.businessHours)
                      .filter(([, h]) => h.closed)
                      .map(([d]) => Number(d))}
                  />
                  <CancelBookingButton appointmentId={appt.id} />
                </>
              )}
              {active && !policy.allowed && (
                <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  <Info className="mt-0.5 size-4 shrink-0" /> {policy.reason}
                </p>
              )}
              <Button asChild variant="ghost">
                <a href={whatsappLink(settings.whatsappNumber, `Hello Beauty Empire! About my booking ${appt.reference}:`)} target="_blank" rel="noopener noreferrer">
                  <WhatsappIcon className="size-4 text-[#1f9d55]" /> Message the salon
                </a>
              </Button>
              {!active && appt.status !== "COMPLETED" && (
                <Button asChild>
                  <Link href={`/book?${appt.services.map((s) => `service=${s.serviceId}`).join("&")}`}>Book again</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {appt.status === "COMPLETED" && (
            <Card>
              <CardHeader>
                <CardTitle>{appt.review ? "Your review" : "How was your visit?"}</CardTitle>
              </CardHeader>
              <CardContent>
                {appt.review ? (
                  <div className="text-sm">
                    <p className="text-magenta">{"★".repeat(appt.review.rating)}</p>
                    <p className="mt-2 text-muted-foreground">{appt.review.comment}</p>
                    <Badge className="mt-3" variant={appt.review.status === "APPROVED" ? "success" : appt.review.status === "REJECTED" ? "danger" : "warning"}>
                      {appt.review.status === "APPROVED" ? "Published" : appt.review.status === "REJECTED" ? "Not published" : "Awaiting moderation"}
                    </Badge>
                  </div>
                ) : (
                  <ReviewForm appointmentId={appt.id} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
