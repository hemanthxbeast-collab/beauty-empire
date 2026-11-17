import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { ActionButton } from "@/components/dashboard/action-button";
import { AdminRescheduleDialog, StatusActions } from "@/components/admin/booking-admin-actions";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { allowedTransitions } from "@/server/services/booking";
import { approveRescheduleRequestAction, declineRescheduleRequestAction, recordSalonPaymentAction, refundPaymentAction } from "@/server/actions/admin-ops";
import { addDaysToDateKey, dateKeyInTz, formatInTz } from "@/lib/time";
import { formatDuration, formatINR } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata = { title: "Booking details" };

export default async function AdminBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [appt, settings, staff] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id },
      include: {
        services: { orderBy: { sortOrder: "asc" } },
        staff: { select: { id: true, title: true, user: { select: { name: true } } } },
        customer: { select: { id: true, user: { select: { id: true, name: true, email: true } }, _count: { select: { appointments: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
        offer: { select: { title: true } },
        review: { select: { rating: true, status: true } },
      },
    }),
    getSalonSettings(),
    prisma.staffProfile.findMany({ where: { isBookable: true, user: { isActive: true } }, orderBy: { displayOrder: "asc" }, select: { id: true, user: { select: { name: true } } } }),
  ]);
  if (!appt) notFound();
  const tz = settings.timezone;
  const today = dateKeyInTz(new Date(), tz);
  const allowed = allowedTransitions(admin.role, appt.status).filter((s) => !((s === "COMPLETED" || s === "NO_SHOW") && appt.startAt > new Date()));
  const active = appt.status === "PENDING" || appt.status === "CONFIRMED";
  const audits = await prisma.auditLog.findMany({ where: { entityType: "Appointment", entityId: appt.id }, orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { name: true } } } });

  return (
    <>
      <Link href="/admin/bookings" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> All bookings
      </Link>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-sm text-magenta">{appt.reference}</p>
          <h1 className="mt-1 font-serif text-3xl text-charcoal sm:text-4xl">{formatInTz(appt.startAt, "EEEE, d MMMM yyyy", tz)}</h1>
          <p className="mt-1 text-muted-foreground">
            {formatInTz(appt.startAt, "h:mm a", tz)} – {formatInTz(appt.endAt, "h:mm a", tz)} · {appt.staff.user.name}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={appt.status} />
            <PaymentBadge status={appt.paymentStatus} />
            <Badge variant="outline">{appt.paymentMethod === "RAZORPAY" ? "Online (Razorpay)" : "Pay at salon"}</Badge>
            {(appt.status === "CANCELLED" || appt.status === "REJECTED") && appt.paymentStatus === "PAID" && <Badge variant="danger">Refund due — use Refund below</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <StatusActions appointmentId={appt.id} allowed={allowed as Array<"CONFIRMED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "NO_SHOW">} />
          {active && (
            <AdminRescheduleDialog
              appointmentId={appt.id}
              serviceIds={appt.services.map((s) => s.serviceId)}
              currentStaffId={appt.staff.id}
              staff={staff.map((s) => ({ id: s.id, name: s.user.name }))}
              today={today}
              lastDate={addDaysToDateKey(today, settings.maxAdvanceDays)}
            />
          )}
        </div>
      </div>

      {appt.rescheduleRequestedStartAt && active && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-sky-900">
            <p className="font-medium">Customer requested a new time: {formatInTz(appt.rescheduleRequestedStartAt, "EEE d MMM yyyy, h:mm a", tz)}</p>
            {appt.rescheduleRequestNote && <p className="mt-1">“{appt.rescheduleRequestNote}”</p>}
          </div>
          <div className="flex gap-2">
            <ActionButton action={approveRescheduleRequestAction} args={appt.id}>
              Approve
            </ActionButton>
            <ActionButton action={declineRescheduleRequestAction} args={appt.id} variant="outline">
              Decline
            </ActionButton>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {appt.services.map((s) => (
                    <tr key={s.id} className="border-b border-border">
                      <td className="py-3">
                        {s.serviceName}
                        <span className="block text-xs text-muted-foreground">{formatDuration(s.durationMinutes)}</span>
                      </td>
                      <td className="py-3 text-right">{formatINR(s.price, { decimals: true })}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 text-muted-foreground">Subtotal</td>
                    <td className="pt-3 text-right">{formatINR(appt.subtotal, { decimals: true })}</td>
                  </tr>
                  {appt.discount.gt(0) && (
                    <tr className="text-magenta">
                      <td>Discount {appt.offer && `· ${appt.offer.title}`}</td>
                      <td className="text-right">−{formatINR(appt.discount, { decimals: true })}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pt-2 font-medium">Total</td>
                    <td className="pt-2 text-right font-serif text-2xl text-magenta">{formatINR(appt.total, { decimals: true })}</td>
                  </tr>
                </tbody>
              </table>
              {(appt.notes || appt.specialRequirements || appt.cancellationReason || appt.staffNotes) && (
                <dl className="mt-6 space-y-3 rounded-xl bg-ivory p-4 text-sm">
                  {appt.notes && (
                    <div>
                      <dt className="text-xs text-muted-rose">Customer notes</dt>
                      <dd className="whitespace-pre-line">{appt.notes}</dd>
                    </div>
                  )}
                  {appt.specialRequirements && (
                    <div>
                      <dt className="text-xs text-muted-rose">Special requirements</dt>
                      <dd className="whitespace-pre-line">{appt.specialRequirements}</dd>
                    </div>
                  )}
                  {appt.staffNotes && (
                    <div>
                      <dt className="text-xs text-muted-rose">Staff notes</dt>
                      <dd className="whitespace-pre-line">{appt.staffNotes}</dd>
                    </div>
                  )}
                  {appt.cancellationReason && (
                    <div>
                      <dt className="text-xs text-muted-rose">Cancellation / rejection reason</dt>
                      <dd>{appt.cancellationReason}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {appt.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {appt.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">
                          {formatINR(p.amount, { decimals: true })} · {p.method === "RAZORPAY" ? "Razorpay" : "At salon"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.razorpayPaymentId ?? p.razorpayOrderId ?? "—"} · {formatInTz(p.createdAt, "d MMM yyyy, h:mm a", tz)}
                          {p.failureReason && ` · ${p.failureReason}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PaymentBadge status={p.status} />
                        {p.status === "PAID" && (
                          <ActionButton
                            action={refundPaymentAction}
                            args={p.id}
                            variant="ghost"
                            confirm={{ title: "Refund this payment?", description: p.method === "RAZORPAY" ? "A full refund will be issued via Razorpay." : "This records that the cash/card payment was refunded.", destructive: true, confirmLabel: "Refund" }}
                          >
                            Refund
                          </ActionButton>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {appt.paymentStatus !== "PAID" && appt.paymentStatus !== "REFUNDED" && appt.status !== "CANCELLED" && appt.status !== "REJECTED" && (
                <div className="mt-4">
                  <ActionButton action={recordSalonPaymentAction} args={appt.id} variant="secondary" confirm={{ title: `Record ${formatINR(appt.total, { decimals: true })} paid at salon?`, confirmLabel: "Record payment" }}>
                    Record payment at salon
                  </ActionButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <UserRound className="size-4 text-magenta" /> {appt.customerName}
                {!appt.customer && <Badge variant="neutral">Guest</Badge>}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-magenta" />
                <a href={`mailto:${appt.customerEmail}`} className="hover:text-magenta">
                  {appt.customerEmail}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-magenta" />
                <a href={`tel:${appt.customerPhone}`} className="hover:text-magenta">
                  {appt.customerPhone}
                </a>
                <a href={whatsappLink(appt.customerPhone, `Hello ${appt.customerName.split(" ")[0]}, this is Beauty Empire regarding your booking ${appt.reference}.`)} target="_blank" rel="noopener noreferrer" className="text-xs text-whatsapp hover:underline">
                  WhatsApp
                </a>
              </p>
              {appt.customer && (
                <Link href={`/admin/customers/${appt.customer.user.id}`} className="inline-block text-magenta hover:underline">
                  View customer history ({appt.customer._count.appointments} bookings)
                </Link>
              )}
              {appt.review && <p className="text-xs text-muted-foreground">Review: {"★".repeat(appt.review.rating)} ({appt.review.status.toLowerCase()})</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {audits.map((a) => (
                  <li key={a.id} className="border-l-2 border-rose pl-3">
                    <p className="text-charcoal">{a.action.replace(/\./g, " › ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor?.name ?? "System / guest"} · {formatInTz(a.createdAt, "d MMM, h:mm a", tz)}
                    </p>
                  </li>
                ))}
                <li className="border-l-2 border-border pl-3 text-xs text-muted-foreground">Created {formatInTz(appt.createdAt, "d MMM yyyy, h:mm a", tz)}</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
