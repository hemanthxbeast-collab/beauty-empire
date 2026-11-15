import "server-only";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { sendEmail } from "@/server/email/send";
import {
  bookingReceivedTemplate,
  bookingStatusTemplate,
  reminderTemplate,
  type BookingEmailData,
  type BookingStatusKind,
} from "@/server/email/templates";
import { bookingAccessToken } from "@/server/services/tokens";
import { getSalonSettings } from "@/server/services/settings";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatInTz } from "@/lib/time";
import { formatINR } from "@/lib/utils";
import type { NotificationType } from "@/generated/prisma/enums";

const appointmentForEmail = {
  id: true,
  reference: true,
  startAt: true,
  status: true,
  paymentStatus: true,
  total: true,
  customerName: true,
  customerEmail: true,
  customerId: true,
  customer: { select: { userId: true } },
  staff: { select: { userId: true, user: { select: { name: true } } } },
  services: { select: { serviceName: true }, orderBy: { sortOrder: "asc" as const } },
} as const;

async function loadForEmail(appointmentId: string) {
  return prisma.appointment.findUnique({ where: { id: appointmentId }, select: appointmentForEmail });
}

export function manageUrl(a: { id: string; reference: string; customerId: string | null }) {
  return a.customerId
    ? `${env.appUrl}/account/appointments/${a.id}`
    : `${env.appUrl}/book/confirmation/${a.reference}?t=${bookingAccessToken(a.id)}`;
}

async function emailData(a: NonNullable<Awaited<ReturnType<typeof loadForEmail>>>): Promise<BookingEmailData> {
  const settings = await getSalonSettings();
  return {
    customerName: a.customerName,
    reference: a.reference,
    when: formatInTz(a.startAt, "EEEE, d MMMM yyyy 'at' h:mm a", settings.timezone),
    services: a.services.map((s) => s.serviceName).join(", "),
    staff: a.staff.user.name,
    total: formatINR(a.total),
    status: APPOINTMENT_STATUS_LABELS[a.status],
    payment: PAYMENT_STATUS_LABELS[a.paymentStatus],
    manageUrl: manageUrl(a),
  };
}

export async function notifyUsers(userIds: string[], n: { type: NotificationType; title: string; body: string; link?: string }) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  await prisma.notification.createMany({ data: unique.map((userId) => ({ userId, ...n })) });
}

export async function adminUserIds() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  return admins.map((a) => a.id);
}

/** Emails + in-app notifications after a booking is created. Never throws. */
export async function onBookingCreated(appointmentId: string) {
  try {
    const a = await loadForEmail(appointmentId);
    if (!a) return;
    const data = await emailData(a);
    await sendEmail(a.customerEmail, bookingReceivedTemplate(data));
    const admins = await adminUserIds();
    await notifyUsers(admins, {
      type: "BOOKING_CREATED",
      title: `New booking ${a.reference}`,
      body: `${a.customerName} · ${data.services} · ${data.when}`,
      link: `/admin/bookings?q=${a.reference}`,
    });
    await notifyUsers([a.staff.userId], {
      type: "BOOKING_CREATED",
      title: `New appointment ${a.reference}`,
      body: `${data.services} · ${data.when}`,
      link: `/staff/appointments`,
    });
    if (a.customer?.userId) {
      await notifyUsers([a.customer.userId], {
        type: a.status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_CREATED",
        title: a.status === "CONFIRMED" ? "Appointment confirmed" : "Booking received",
        body: `${data.services} · ${data.when}`,
        link: `/account/appointments/${a.id}`,
      });
    }
  } catch (err) {
    console.error("[notify] onBookingCreated failed", err);
  }
}

const kindToType: Record<BookingStatusKind, NotificationType> = {
  confirmed: "BOOKING_CONFIRMED",
  cancelled: "BOOKING_CANCELLED",
  rejected: "BOOKING_REJECTED",
  rescheduled: "BOOKING_RESCHEDULED",
  completed: "BOOKING_COMPLETED",
};

export async function onBookingStatusChanged(appointmentId: string, kind: BookingStatusKind, reason?: string | null, opts: { notifyAdmins?: boolean } = {}) {
  try {
    const a = await loadForEmail(appointmentId);
    if (!a) return;
    const data = await emailData(a);
    await sendEmail(a.customerEmail, bookingStatusTemplate(data, kind, reason));
    const title = { confirmed: "Appointment confirmed", cancelled: "Appointment cancelled", rejected: "Booking declined", rescheduled: "Appointment rescheduled", completed: "Thank you for visiting" }[kind];
    if (a.customer?.userId) {
      await notifyUsers([a.customer.userId], { type: kindToType[kind], title, body: `${a.reference} · ${data.when}`, link: `/account/appointments/${a.id}` });
    }
    await notifyUsers([a.staff.userId], { type: kindToType[kind], title: `${title}: ${a.reference}`, body: `${data.services} · ${data.when}`, link: `/staff/appointments` });
    if (opts.notifyAdmins) {
      await notifyUsers(await adminUserIds(), { type: kindToType[kind], title: `${title}: ${a.reference}`, body: `${a.customerName} · ${data.when}`, link: `/admin/bookings?q=${a.reference}` });
    }
  } catch (err) {
    console.error("[notify] onBookingStatusChanged failed", err);
  }
}

export async function sendReminder(appointmentId: string) {
  const a = await loadForEmail(appointmentId);
  if (!a) return false;
  const result = await sendEmail(a.customerEmail, reminderTemplate(await emailData(a)));
  if (a.customer?.userId) {
    await notifyUsers([a.customer.userId], { type: "REMINDER", title: "Upcoming appointment", body: `${a.reference} is coming up soon.`, link: `/account/appointments/${a.id}` });
  }
  return result.delivered || Boolean(result.devFile);
}
