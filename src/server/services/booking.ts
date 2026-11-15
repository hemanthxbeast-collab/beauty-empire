import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { integrations } from "@/server/env";
import { audit } from "@/server/services/audit";
import { computeAvailability, loadBookableServices, type BookableService } from "@/server/services/availability";
import { getSalonSettings } from "@/server/services/settings";
import { onBookingCreated, onBookingStatusChanged } from "@/server/services/notifications";
import { canCustomerCancel, generateBookingReference } from "@/lib/booking/slots";
import { dateKeyInTz, dateKeyToDbDate, zonedToUtc } from "@/lib/time";
import type { createBookingSchema } from "@/lib/validations/booking";
import { Prisma } from "@/generated/prisma/client";
import type { AppointmentStatus, UserRole } from "@/generated/prisma/enums";
import type { z } from "zod";

type CreateBookingData = z.output<typeof createBookingSchema>;

/** True when PostgreSQL rejected a write because of the staff-overlap exclusion constraint. */
export function isOverlapViolation(err: unknown): boolean {
  const seen = new Set<unknown>();
  const visit = (e: unknown): boolean => {
    if (!e || typeof e !== "object" || seen.has(e)) return false;
    seen.add(e);
    const o = e as Record<string, unknown>;
    const text = `${String(o.message ?? "")} ${String(o.code ?? "")} ${String(o.originalCode ?? "")} ${String(o.constraint ?? "")}`;
    if (text.includes("appointment_no_staff_overlap") || text.includes("23P01")) return true;
    return visit(o.cause) || visit(o.meta);
  };
  return visit(err);
}

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** Server-side pricing — never trust prices sent by the client. */
export async function priceBooking(services: BookableService[], offerId: string | undefined, dateKey: string) {
  const lines = services.map((s, i) => ({
    serviceId: s.id,
    serviceName: s.name,
    price: s.discountPrice ?? s.price,
    durationMinutes: s.durationMinutes,
    sortOrder: i,
  }));
  const subtotal = lines.reduce((sum, l) => sum.plus(l.price), D(0));
  let discount = D(0);
  let appliedOfferId: string | null = null;

  if (offerId) {
    const day = dateKeyToDbDate(dateKey);
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, isActive: true, validFrom: { lte: day }, validUntil: { gte: day } },
      include: { services: { select: { serviceId: true } } },
    });
    if (!offer) throw new AppError("This offer is not valid for the selected date.", "VALIDATION");
    const eligible = offer.services.length ? new Set(offer.services.map((s) => s.serviceId)) : null;
    const base = lines.filter((l) => !eligible || eligible.has(l.serviceId)).reduce((sum, l) => sum.plus(l.price), D(0));
    if (base.lte(0)) throw new AppError("The selected services are not part of this offer.", "VALIDATION");
    discount = base.mul(offer.discountPercent).div(100).toDecimalPlaces(2);
    appliedOfferId = offer.id;
  }
  const total = subtotal.minus(discount);
  return { lines, subtotal, discount, total, appliedOfferId };
}

async function uniqueReference(tx: Prisma.TransactionClient) {
  for (let i = 0; i < 5; i++) {
    const ref = generateBookingReference((n) => randomBytes(n));
    const exists = await tx.appointment.findUnique({ where: { reference: ref }, select: { id: true } });
    if (!exists) return ref;
  }
  throw new Error("Could not allocate booking reference");
}

/**
 * Inserts an appointment for one staff member inside a transaction guarded by a per-staff
 * advisory lock plus a re-check, with the PostgreSQL exclusion constraint as the final guarantee.
 */
async function insertAppointment(args: {
  staffId: string;
  startAt: Date;
  endAt: Date;
  data: Omit<Prisma.AppointmentUncheckedCreateInput, "staffId" | "startAt" | "endAt" | "reference" | "services">;
  lines: Array<{ serviceId: string; serviceName: string; price: Prisma.Decimal; durationMinutes: number; sortOrder: number }>;
}) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"staff:" + args.staffId}))`;
      const clash = await tx.appointment.findFirst({
        where: { staffId: args.staffId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: args.endAt }, endAt: { gt: args.startAt } },
        select: { id: true },
      });
      if (clash) throw new AppError("SLOT_TAKEN", "CONFLICT");
      const reference = await uniqueReference(tx);
      return tx.appointment.create({
        data: {
          ...args.data,
          reference,
          staffId: args.staffId,
          startAt: args.startAt,
          endAt: args.endAt,
          services: { create: args.lines },
        },
        select: { id: true, reference: true, status: true, paymentMethod: true, total: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 },
  );
}

export async function createBooking(input: CreateBookingData, ctx: { userId: string | null; customerProfileId: string | null; ip?: string }) {
  const settings = await getSalonSettings();

  if (input.paymentMethod === "RAZORPAY" && !(settings.onlinePaymentsEnabled && integrations.razorpay)) {
    throw new AppError("Online payment is not available right now. Please choose Pay at Salon.", "VALIDATION");
  }
  if (input.paymentMethod === "PAY_AT_SALON" && !settings.payAtSalonEnabled) {
    throw new AppError("Pay at salon is currently unavailable. Please pay online.", "VALIDATION");
  }

  const { rawSlots, services } = await computeAvailability({ serviceIds: input.serviceIds, staffId: input.staffId, date: input.date });
  const slot = rawSlots.find((s) => s.minuteOfDay === input.minuteOfDay);
  if (!slot) throw new AppError("Sorry, that time slot is no longer available. Please choose another time.", "CONFLICT");

  const pricing = await priceBooking(services, input.offerId, input.date);
  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const startAt = zonedToUtc(input.date, input.minuteOfDay, settings.timezone);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  // "No preference": balance load — try the least busy professional first.
  let candidates = slot.staffIds;
  if (input.staffId === "any" && candidates.length > 1) {
    const counts = await prisma.appointment.groupBy({
      by: ["staffId"],
      where: { staffId: { in: candidates }, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: zonedToUtc(input.date, 0, settings.timezone), lt: endAt } },
      _count: { _all: true },
    });
    const load = new Map(counts.map((c) => [c.staffId, c._count._all]));
    candidates = [...candidates].sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0));
  }

  const status: AppointmentStatus = settings.autoConfirmBookings && input.paymentMethod === "PAY_AT_SALON" ? "CONFIRMED" : "PENDING";

  for (const staffId of candidates) {
    try {
      const appointment = await insertAppointment({
        staffId,
        startAt,
        endAt,
        lines: pricing.lines,
        data: {
          customerId: ctx.customerProfileId,
          status,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          notes: input.customer.notes ?? null,
          specialRequirements: input.customer.specialRequirements ?? null,
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          total: pricing.total,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentMethod === "RAZORPAY" ? "PENDING" : "UNPAID",
          offerId: pricing.appliedOfferId,
        },
      });
      await audit({ actorId: ctx.userId, action: "booking.create", entityType: "Appointment", entityId: appointment.id, metadata: { reference: appointment.reference }, ipAddress: ctx.ip });
      // Notifications are sent after commit; failures never undo the booking.
      if (appointment.paymentMethod === "PAY_AT_SALON") await onBookingCreated(appointment.id);
      return appointment;
    } catch (err) {
      const conflict = (err instanceof AppError && err.message === "SLOT_TAKEN") || isOverlapViolation(err);
      if (!conflict) throw err;
      // Try the next eligible professional (only possible with "no preference").
    }
  }
  throw new AppError("Sorry, that time slot was just booked by someone else. Please choose another time.", "CONFLICT");
}

// ───────────────────────── Status transitions ─────────────────────────

const ADMIN_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  NO_SHOW: [],
};

const STAFF_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: [],
  CONFIRMED: ["COMPLETED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  NO_SHOW: [],
};

export function allowedTransitions(role: UserRole, from: AppointmentStatus): AppointmentStatus[] {
  if (role === "ADMIN") return ADMIN_TRANSITIONS[from];
  if (role === "STAFF") return STAFF_TRANSITIONS[from];
  return [];
}

export async function updateBookingStatus(params: {
  appointmentId: string;
  status: AppointmentStatus;
  reason?: string;
  actor: { id: string; role: UserRole; staffProfileId?: string | null };
}) {
  const existing = await prisma.appointment.findUnique({ where: { id: params.appointmentId }, select: { id: true, status: true, staffId: true, startAt: true, paymentStatus: true } });
  if (!existing) throw new AppError("Appointment not found.", "NOT_FOUND");
  if (params.actor.role === "STAFF" && existing.staffId !== params.actor.staffProfileId) {
    throw new AppError("You can only update your own appointments.", "FORBIDDEN");
  }
  if (!allowedTransitions(params.actor.role, existing.status).includes(params.status)) {
    throw new AppError(`Cannot change a ${existing.status.toLowerCase()} appointment to ${params.status.toLowerCase()}.`, "VALIDATION");
  }
  if ((params.status === "COMPLETED" || params.status === "NO_SHOW") && existing.startAt.getTime() > Date.now()) {
    throw new AppError("An appointment can only be completed or marked no-show after its start time.", "VALIDATION");
  }

  const now = new Date();
  // Conditional update guards against a concurrent transition (optimistic concurrency).
  const result = await prisma.appointment.updateMany({
    where: { id: existing.id, status: existing.status },
    data: {
      status: params.status,
      ...(params.status === "CANCELLED" || params.status === "REJECTED"
        ? { cancelledAt: now, cancelledBy: params.actor.role, cancellationReason: params.reason ?? null, rescheduleRequestedAt: null, rescheduleRequestedStartAt: null, rescheduleRequestNote: null }
        : {}),
      ...(params.status === "COMPLETED" ? { completedAt: now } : {}),
    },
  });
  if (result.count === 0) throw new AppError("This appointment was updated by someone else. Please refresh.", "CONFLICT");

  await audit({ actorId: params.actor.id, action: `booking.status.${params.status.toLowerCase()}`, entityType: "Appointment", entityId: existing.id, metadata: { from: existing.status, to: params.status, reason: params.reason ?? null } });

  const kind = ({ CONFIRMED: "confirmed", CANCELLED: "cancelled", REJECTED: "rejected", COMPLETED: "completed" } as const)[params.status as "CONFIRMED"];
  if (kind) await onBookingStatusChanged(existing.id, kind, params.reason);
}

export async function cancelBookingAsCustomer(params: { appointmentId: string; customerProfileId: string; userId: string; reason?: string }) {
  const settings = await getSalonSettings();
  const appt = await prisma.appointment.findUnique({ where: { id: params.appointmentId }, select: { id: true, customerId: true, status: true, startAt: true } });
  // Ownership check: respond "not found" so ids of other customers' bookings are not confirmed.
  if (!appt || appt.customerId !== params.customerProfileId) throw new AppError("Appointment not found.", "NOT_FOUND");
  const policy = canCustomerCancel({ status: appt.status, startAt: appt.startAt, now: new Date(), cancellationWindowHours: settings.cancellationWindowHours });
  if (!policy.allowed) throw new AppError(policy.reason, "VALIDATION");

  const result = await prisma.appointment.updateMany({
    where: { id: appt.id, status: appt.status },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "CUSTOMER", cancellationReason: params.reason ?? "Cancelled by customer", rescheduleRequestedAt: null, rescheduleRequestedStartAt: null, rescheduleRequestNote: null },
  });
  if (result.count === 0) throw new AppError("This appointment was just updated. Please refresh.", "CONFLICT");
  await audit({ actorId: params.userId, action: "booking.cancel.customer", entityType: "Appointment", entityId: appt.id });
  await onBookingStatusChanged(appt.id, "cancelled", params.reason, { notifyAdmins: true });
}

export async function requestReschedule(params: { appointmentId: string; customerProfileId: string; userId: string; date: string; minuteOfDay: number; note?: string }) {
  const settings = await getSalonSettings();
  const appt = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    select: { id: true, customerId: true, status: true, startAt: true, staffId: true, reference: true, services: { select: { serviceId: true } } },
  });
  if (!appt || appt.customerId !== params.customerProfileId) throw new AppError("Appointment not found.", "NOT_FOUND");
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") throw new AppError("This appointment can no longer be rescheduled.", "VALIDATION");
  const policy = canCustomerCancel({ status: appt.status, startAt: appt.startAt, now: new Date(), cancellationWindowHours: settings.cancellationWindowHours });
  if (!policy.allowed) throw new AppError(policy.reason.replace("cancelled", "rescheduled"), "VALIDATION");

  const { rawSlots } = await computeAvailability({
    serviceIds: appt.services.map((s) => s.serviceId),
    staffId: appt.staffId,
    date: params.date,
    excludeAppointmentId: appt.id,
  });
  if (!rawSlots.some((s) => s.minuteOfDay === params.minuteOfDay)) throw new AppError("That time is not available. Please pick another slot.", "CONFLICT");

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { rescheduleRequestedAt: new Date(), rescheduleRequestedStartAt: zonedToUtc(params.date, params.minuteOfDay, settings.timezone), rescheduleRequestNote: params.note ?? null },
  });
  await audit({ actorId: params.userId, action: "booking.reschedule.request", entityType: "Appointment", entityId: appt.id });
  const { notifyUsers, adminUserIds } = await import("@/server/services/notifications");
  await notifyUsers(await adminUserIds(), { type: "RESCHEDULE_REQUESTED", title: `Reschedule requested: ${appt.reference}`, body: params.note ?? "Customer requested a new time.", link: `/admin/bookings?q=${appt.reference}` });
}

/** Admin reschedule (also used to approve a customer's request). Conflict-safe. */
export async function rescheduleBooking(params: { appointmentId: string; date: string; minuteOfDay: number; staffId?: string; actorId: string }) {
  const settings = await getSalonSettings();
  const appt = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    select: { id: true, status: true, staffId: true, services: { select: { serviceId: true, durationMinutes: true } } },
  });
  if (!appt) throw new AppError("Appointment not found.", "NOT_FOUND");
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") throw new AppError("Only pending or confirmed appointments can be rescheduled.", "VALIDATION");

  const staffId = params.staffId ?? appt.staffId;
  await loadBookableServices(appt.services.map((s) => s.serviceId));
  const { rawSlots } = await computeAvailability({
    serviceIds: appt.services.map((s) => s.serviceId),
    staffId,
    date: params.date,
    excludeAppointmentId: appt.id,
    ignoreLeadTime: true,
  });
  if (!rawSlots.some((s) => s.minuteOfDay === params.minuteOfDay && s.staffIds.includes(staffId))) {
    throw new AppError("That professional is not available at the selected time.", "CONFLICT");
  }
  const duration = appt.services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const startAt = zonedToUtc(params.date, params.minuteOfDay, settings.timezone);
  const endAt = new Date(startAt.getTime() + duration * 60_000);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"staff:" + staffId}))`;
      const clash = await tx.appointment.findFirst({
        where: { id: { not: appt.id }, staffId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: endAt }, endAt: { gt: startAt } },
        select: { id: true },
      });
      if (clash) throw new AppError("SLOT_TAKEN", "CONFLICT");
      await tx.appointment.update({
        where: { id: appt.id },
        data: { staffId, startAt, endAt, rescheduleRequestedAt: null, rescheduleRequestedStartAt: null, rescheduleRequestNote: null, reminderSentAt: null },
      });
      await audit({ tx, actorId: params.actorId, action: "booking.reschedule", entityType: "Appointment", entityId: appt.id, metadata: { date: params.date, minuteOfDay: params.minuteOfDay, staffId } });
    });
  } catch (err) {
    if ((err instanceof AppError && err.message === "SLOT_TAKEN") || isOverlapViolation(err)) {
      throw new AppError("That time was just taken. Please choose another slot.", "CONFLICT");
    }
    throw err;
  }
  await onBookingStatusChanged(appt.id, "rescheduled");
}

export async function assignStaff(params: { appointmentId: string; staffId: string; actorId: string }) {
  const appt = await prisma.appointment.findUnique({ where: { id: params.appointmentId }, select: { id: true, startAt: true } });
  if (!appt) throw new AppError("Appointment not found.", "NOT_FOUND");
  const settings = await getSalonSettings();
  const date = dateKeyInTz(appt.startAt, settings.timezone);
  const minute = Math.round((appt.startAt.getTime() - zonedToUtc(date, 0, settings.timezone).getTime()) / 60_000);
  await rescheduleBooking({ appointmentId: appt.id, date, minuteOfDay: minute, staffId: params.staffId, actorId: params.actorId });
}
