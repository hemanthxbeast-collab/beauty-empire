"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireCustomer } from "@/server/session";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { cancelBookingAsCustomer, createBooking, requestReschedule } from "@/server/services/booking";
import { clientIp, enforceRateLimit } from "@/server/services/rate-limit";
import { bookingAccessToken } from "@/server/services/tokens";
import { prisma } from "@/server/db";
import { audit } from "@/server/services/audit";
import { adminUserIds, notifyUsers } from "@/server/services/notifications";
import { cancelBookingSchema, createBookingSchema, rescheduleRequestSchema, reviewSchema } from "@/lib/validations/booking";

export type CreateBookingResult = { id: string; reference: string; token: string; requiresPayment: boolean };

export async function createBookingAction(input: unknown): Promise<ActionResult<CreateBookingResult>> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your booking details.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const ip = await clientIp();
    await enforceRateLimit("booking", ip);
    const user = await getCurrentUser();
    // Staff and admins should book on behalf of guests from the dashboard, not as customers.
    let customerProfileId: string | null = null;
    if (user && user.role === "CUSTOMER" && user.emailVerified) {
      customerProfileId = (await requireCustomer()).customerProfileId;
    }
    const appt = await createBooking(parsed.data, { userId: user?.id ?? null, customerProfileId, ip });
    revalidatePath("/account/appointments");
    return {
      ok: true,
      data: { id: appt.id, reference: appt.reference, token: bookingAccessToken(appt.id), requiresPayment: appt.paymentMethod === "RAZORPAY" },
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function cancelMyBookingAction(input: unknown): Promise<ActionResult> {
  const parsed = cancelBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    await enforceRateLimit("account");
    const user = await requireCustomer();
    await cancelBookingAsCustomer({ appointmentId: parsed.data.appointmentId, customerProfileId: user.customerProfileId, userId: user.id, reason: parsed.data.reason });
    revalidatePath("/account", "layout");
    return { ok: true, data: undefined, message: "Your appointment has been cancelled." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function requestRescheduleAction(input: unknown): Promise<ActionResult> {
  const parsed = rescheduleRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  try {
    await enforceRateLimit("account");
    const user = await requireCustomer();
    await requestReschedule({ ...parsed.data, customerProfileId: user.customerProfileId, userId: user.id });
    revalidatePath("/account", "layout");
    return { ok: true, data: undefined, message: "Reschedule request sent. We'll confirm your new time shortly." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function submitReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await enforceRateLimit("review");
    const user = await requireCustomer();
    const appt = await prisma.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      select: { id: true, customerId: true, status: true, review: { select: { id: true } }, services: { select: { serviceId: true }, orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    if (!appt || appt.customerId !== user.customerProfileId) throw new AppError("Appointment not found.", "NOT_FOUND");
    if (appt.status !== "COMPLETED") throw new AppError("You can review an appointment once it has been completed.", "VALIDATION");
    if (appt.review) throw new AppError("You have already reviewed this appointment.", "CONFLICT");
    const review = await prisma.review.create({
      data: {
        appointmentId: appt.id,
        customerId: user.customerProfileId,
        serviceId: appt.services[0]?.serviceId ?? null,
        rating: parsed.data.rating,
        title: parsed.data.title ?? null,
        comment: parsed.data.comment,
      },
    });
    await audit({ actorId: user.id, action: "review.create", entityType: "Review", entityId: review.id });
    await notifyUsers(await adminUserIds(), { type: "REVIEW_SUBMITTED", title: "New review awaiting moderation", body: `${parsed.data.rating}★ from ${user.name}`, link: "/admin/reviews" });
    revalidatePath("/account/reviews");
    return { ok: true, data: undefined, message: "Thank you! Your review will appear once approved." };
  } catch (err) {
    return toActionError(err);
  }
}
