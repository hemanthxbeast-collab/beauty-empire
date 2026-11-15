"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/server/db";
import { requireAdmin, requireRole } from "@/server/session";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { audit } from "@/server/services/audit";
import { integrations } from "@/server/env";
import { assignStaff, rescheduleBooking, updateBookingStatus } from "@/server/services/booking";
import { recordSalonPayment, refundPayment } from "@/server/services/payments";
import { getSalonSettings } from "@/server/services/settings";
import { adminRescheduleSchema, assignStaffSchema, availabilitySchema, bookingStatusUpdateSchema, leaveSchema, reviewModerationSchema, settingsSchema, staffCreateSchema, staffUpdateSchema } from "@/lib/validations/admin";
import { idSchema } from "@/lib/validations/booking";
import { addDaysToDateKey, dateKeyInTz, dateKeyToDbDate, hhmmToMinutes, minuteOfDayInTz, zonedToUtc } from "@/lib/time";
import { slugify } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";

const refreshBookings = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/staff", "layout");
  revalidatePath("/account", "layout");
};

// ───────────────────────── Bookings ─────────────────────────

/** Admin: any allowed transition. Staff: complete / no-show on their own confirmed appointments (enforced in the service). */
export async function updateBookingStatusAction(input: unknown): Promise<ActionResult> {
  const parsed = bookingStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const actor = await requireRole("ADMIN", "STAFF");
    await updateBookingStatus({ ...parsed.data, actor: { id: actor.id, role: actor.role, staffProfileId: actor.staffProfileId } });
    refreshBookings();
    return { ok: true, data: undefined, message: `Booking marked ${parsed.data.status.toLowerCase().replace("_", "-")}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function adminRescheduleAction(input: unknown): Promise<ActionResult> {
  const parsed = adminRescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  try {
    const admin = await requireAdmin();
    await rescheduleBooking({ ...parsed.data, actorId: admin.id });
    refreshBookings();
    return { ok: true, data: undefined, message: "Appointment rescheduled and customer notified." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function approveRescheduleRequestAction(appointmentId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(appointmentId);
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { rescheduleRequestedStartAt: true } });
    if (!appt?.rescheduleRequestedStartAt) throw new AppError("There is no pending reschedule request.", "VALIDATION");
    const settings = await getSalonSettings();
    await rescheduleBooking({
      appointmentId,
      date: dateKeyInTz(appt.rescheduleRequestedStartAt, settings.timezone),
      minuteOfDay: minuteOfDayInTz(appt.rescheduleRequestedStartAt, settings.timezone),
      actorId: admin.id,
    });
    refreshBookings();
    return { ok: true, data: undefined, message: "Reschedule approved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function declineRescheduleRequestAction(appointmentId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(appointmentId);
    await prisma.appointment.update({ where: { id: appointmentId }, data: { rescheduleRequestedAt: null, rescheduleRequestedStartAt: null, rescheduleRequestNote: null } });
    await audit({ actorId: admin.id, action: "booking.reschedule.decline", entityType: "Appointment", entityId: appointmentId });
    refreshBookings();
    return { ok: true, data: undefined, message: "Reschedule request declined." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function assignStaffAction(input: unknown): Promise<ActionResult> {
  const parsed = assignStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const admin = await requireAdmin();
    await assignStaff({ ...parsed.data, actorId: admin.id });
    refreshBookings();
    return { ok: true, data: undefined, message: "Professional reassigned." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function recordSalonPaymentAction(appointmentId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(appointmentId);
    await recordSalonPayment(appointmentId, admin.id);
    refreshBookings();
    return { ok: true, data: undefined, message: "Payment recorded." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function refundPaymentAction(paymentId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(paymentId);
    await refundPayment(paymentId, admin.id);
    refreshBookings();
    return { ok: true, data: undefined, message: "Payment refunded." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Reviews ─────────────────────────

export async function moderateReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewModerationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const admin = await requireAdmin();
    await prisma.review.update({
      where: { id: parsed.data.reviewId },
      data: { status: parsed.data.status, moderatedAt: new Date(), ...(parsed.data.isFeatured !== undefined ? { isFeatured: parsed.data.isFeatured } : {}) },
    });
    await audit({ actorId: admin.id, action: `review.${parsed.data.status.toLowerCase()}`, entityType: "Review", entityId: parsed.data.reviewId });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Review updated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteReviewAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(id);
    await prisma.review.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "review.delete", entityType: "Review", entityId: id });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Review deleted." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Customers & messages ─────────────────────────

export async function setUserActiveAction(args: { userId: string; isActive: boolean }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (args.userId === admin.id) throw new AppError("You cannot deactivate your own account.", "VALIDATION");
    const target = await prisma.user.findUnique({ where: { id: args.userId }, select: { role: true } });
    if (!target) throw new AppError("User not found.", "NOT_FOUND");
    if (target.role === "ADMIN") throw new AppError("Administrator accounts cannot be deactivated here.", "FORBIDDEN");
    await prisma.$transaction([
      prisma.user.update({ where: { id: args.userId }, data: { isActive: Boolean(args.isActive) } }),
      // Deactivation immediately revokes every session.
      ...(args.isActive ? [] : [prisma.session.deleteMany({ where: { userId: args.userId } })]),
    ]);
    await audit({ actorId: admin.id, action: args.isActive ? "user.activate" : "user.deactivate", entityType: "User", entityId: args.userId });
    revalidatePath("/admin", "layout");
    return { ok: true, data: undefined, message: args.isActive ? "Account enabled." : "Account disabled and signed out." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setContactStatusAction(args: { id: string; status: "NEW" | "READ" | "RESOLVED" }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(args.id);
    if (!["NEW", "READ", "RESOLVED"].includes(args.status)) throw new AppError("Invalid status", "VALIDATION");
    await prisma.contactMessage.update({ where: { id: args.id }, data: { status: args.status } });
    await audit({ actorId: admin.id, action: `contact.${args.status.toLowerCase()}`, entityType: "ContactMessage", entityId: args.id });
    revalidatePath("/admin/customers");
    return { ok: true, data: undefined, message: "Message updated." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Staff ─────────────────────────

export async function createStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = staffCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const admin = await requireAdmin();
    const d = parsed.data;
    if (await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } })) {
      return { ok: false, error: "An account with this email already exists.", fieldErrors: { email: ["Email already in use"] } };
    }
    const settings = await getSalonSettings();
    const userId = randomUUID();
    const hash = await hashPassword(d.password);
    let slug = slugify(d.name);
    if (await prisma.staffProfile.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${userId.slice(0, 6)}`;
    const staff = await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name: d.name,
          email: d.email,
          phone: d.phone,
          role: "STAFF",
          emailVerified: true, // created by an administrator
          accounts: { create: { id: randomUUID(), accountId: userId, providerId: "credential", password: hash } },
        },
      });
      const profile = await tx.staffProfile.create({
        data: {
          userId,
          slug,
          title: d.title,
          bio: d.bio || null,
          photoUrl: d.photoUrl ?? null,
          specialties: d.specialties,
          yearsOfExperience: d.yearsOfExperience,
          services: { create: [...new Set(d.serviceIds)].map((serviceId) => ({ serviceId })) },
          availability: {
            create: Object.entries(settings.businessHours).map(([day, h]) => ({ dayOfWeek: Number(day), startMinute: h.open, endMinute: h.close, isAvailable: !h.closed && day !== "0" })),
          },
        },
      });
      await audit({ tx, actorId: admin.id, action: "staff.create", entityType: "StaffProfile", entityId: profile.id, metadata: { email: d.email } });
      return profile;
    });
    revalidatePath("/admin/staff");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: staff.id }, message: "Staff member created. Share the temporary password securely and ask them to change it." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updateStaffAction(input: unknown): Promise<ActionResult> {
  const parsed = staffUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const admin = await requireAdmin();
    const d = parsed.data;
    const staff = await prisma.staffProfile.findUnique({ where: { id: d.staffId }, select: { userId: true } });
    if (!staff) throw new AppError("Staff member not found.", "NOT_FOUND");
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: staff.userId }, data: { name: d.name, phone: d.phone, isActive: d.isActive } });
      if (!d.isActive) await tx.session.deleteMany({ where: { userId: staff.userId } });
      await tx.staffProfile.update({
        where: { id: d.staffId },
        data: {
          title: d.title,
          bio: d.bio || null,
          photoUrl: d.photoUrl ?? null,
          specialties: d.specialties,
          yearsOfExperience: d.yearsOfExperience,
          isBookable: d.isBookable,
          displayOrder: d.displayOrder,
        },
      });
      await tx.staffService.deleteMany({ where: { staffId: d.staffId } });
      if (d.serviceIds.length) await tx.staffService.createMany({ data: [...new Set(d.serviceIds)].map((serviceId) => ({ staffId: d.staffId, serviceId })) });
      await audit({ tx, actorId: admin.id, action: "staff.update", entityType: "StaffProfile", entityId: d.staffId });
    });
    revalidatePath("/admin/staff");
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Staff profile updated." };
  } catch (err) {
    return toActionError(err);
  }
}

/** Resolves which staff profile the caller may edit: admins pass any staffId; staff may only edit their own. */
async function resolveStaffTarget(staffId?: string) {
  const user = await requireRole("ADMIN", "STAFF");
  if (user.role === "STAFF") {
    if (!user.staffProfileId) throw new AppError("Staff profile not found.", "FORBIDDEN");
    if (staffId && staffId !== user.staffProfileId) throw new AppError("You can only manage your own availability.", "FORBIDDEN");
    return { user, staffId: user.staffProfileId };
  }
  if (!staffId) throw new AppError("Choose a staff member.", "VALIDATION");
  return { user, staffId };
}

export async function saveAvailabilityAction(input: unknown): Promise<ActionResult> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the working hours." };
  try {
    const { user, staffId } = await resolveStaffTarget(parsed.data.staffId);
    await prisma.$transaction(
      parsed.data.days.map((day) =>
        prisma.staffAvailability.upsert({
          where: { staffId_dayOfWeek: { staffId, dayOfWeek: day.dayOfWeek } },
          create: { staffId, dayOfWeek: day.dayOfWeek, startMinute: hhmmToMinutes(day.start), endMinute: hhmmToMinutes(day.end), isAvailable: day.isAvailable },
          update: { startMinute: hhmmToMinutes(day.start), endMinute: hhmmToMinutes(day.end), isAvailable: day.isAvailable },
        }),
      ),
    );
    await audit({ actorId: user.id, action: "staff.availability.update", entityType: "StaffProfile", entityId: staffId });
    revalidatePath("/admin/staff");
    revalidatePath("/staff/availability");
    return { ok: true, data: undefined, message: "Working hours saved. Existing bookings are unaffected." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addLeaveAction(input: unknown): Promise<ActionResult> {
  const parsed = leaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the dates." };
  try {
    const { user, staffId } = await resolveStaffTarget(parsed.data.staffId);
    const start = dateKeyToDbDate(parsed.data.startDate);
    const end = dateKeyToDbDate(parsed.data.endDate);
    const settings = await getSalonSettings();
    const clashes = await prisma.appointment.count({
      where: {
        staffId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: zonedToUtc(parsed.data.startDate, 0, settings.timezone), lt: zonedToUtc(addDaysToDateKey(parsed.data.endDate, 1), 0, settings.timezone) },
      },
    });
    const leave = await prisma.staffLeave.create({ data: { staffId, startDate: start, endDate: end, reason: parsed.data.reason || null } });
    await audit({ actorId: user.id, action: "staff.leave.create", entityType: "StaffLeave", entityId: leave.id });
    revalidatePath("/admin/staff");
    revalidatePath("/staff/availability");
    return {
      ok: true,
      data: undefined,
      message: clashes ? `Leave saved. ${clashes} active booking(s) fall in this period — please reassign or reschedule them.` : "Leave saved.",
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteLeaveAction(leaveId: string): Promise<ActionResult> {
  try {
    idSchema.parse(leaveId);
    const leave = await prisma.staffLeave.findUnique({ where: { id: leaveId }, select: { staffId: true } });
    if (!leave) throw new AppError("Leave not found.", "NOT_FOUND");
    const { user } = await resolveStaffTarget(leave.staffId);
    await prisma.staffLeave.delete({ where: { id: leaveId } });
    await audit({ actorId: user.id, action: "staff.leave.delete", entityType: "StaffLeave", entityId: leaveId });
    revalidatePath("/admin/staff");
    revalidatePath("/staff/availability");
    return { ok: true, data: undefined, message: "Leave removed." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Settings ─────────────────────────

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the settings.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    const admin = await requireAdmin();
    const d = parsed.data;
    const businessHours = Object.fromEntries(d.businessHours.map((h, i) => [String(i), { open: hhmmToMinutes(h.open), close: hhmmToMinutes(h.close), closed: h.closed }]));
    const data = {
      ...d,
      addressLine2: d.addressLine2 || null,
      googleMapsEmbedUrl: d.googleMapsEmbedUrl ?? null,
      googleMapsLink: d.googleMapsLink ?? null,
      instagramUrl: d.instagramUrl ?? null,
      facebookUrl: d.facebookUrl ?? null,
      youtubeUrl: d.youtubeUrl ?? null,
      businessHours: businessHours as Prisma.InputJsonValue,
      // Online payments can only be switched on when Razorpay keys exist on the server.
      onlinePaymentsEnabled: d.onlinePaymentsEnabled && integrations.razorpay,
    };
    if (!d.payAtSalonEnabled && !data.onlinePaymentsEnabled) throw new AppError("Enable at least one payment option.", "VALIDATION");
    await prisma.salonSettings.update({ where: { id: 1 }, data });
    await audit({ actorId: admin.id, action: "settings.update", entityType: "SalonSettings", entityId: "1" });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined, message: "Settings saved." };
  } catch (err) {
    return toActionError(err);
  }
}
