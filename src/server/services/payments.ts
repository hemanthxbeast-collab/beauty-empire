import "server-only";
import Razorpay from "razorpay";
import { prisma } from "@/server/db";
import { env, integrations } from "@/server/env";
import { AppError } from "@/server/errors";
import { audit } from "@/server/services/audit";
import { adminUserIds, notifyUsers, onBookingCreated } from "@/server/services/notifications";
import { HOLD_EXPIRED_REASON } from "@/server/services/availability";
import { isOverlapViolation } from "@/server/services/overlap";
import { getSalonSettings } from "@/server/services/settings";
import { Prisma } from "@/generated/prisma/client";
import { verifyCheckoutSignature as verifyCheckoutSignatureWith, verifyWebhookSignature as verifyWebhookSignatureWith } from "@/lib/razorpay-signature";

let client: Razorpay | null = null;
function razorpay() {
  if (!integrations.razorpay) throw new AppError("Online payments are not configured.", "BAD_REQUEST");
  client ??= new Razorpay({ key_id: env.razorpay.keyId!, key_secret: env.razorpay.keySecret! });
  return client;
}

/** Checkout signature check using the server's key secret. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = env.razorpay.keySecret ?? "") {
  return verifyCheckoutSignatureWith(orderId, paymentId, signature, secret);
}

/** Webhook signature check using the configured webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = env.razorpay.webhookSecret ?? "") {
  return verifyWebhookSignatureWith(rawBody, signature, secret);
}

export function toPaise(amount: Prisma.Decimal) {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}

/** Creates (or re-uses) a Razorpay order for an appointment. Amount is always taken from the database. */
export async function createRazorpayOrder(appointmentId: string, actorId: string | null) {
  const settings = await getSalonSettings();
  if (!settings.onlinePaymentsEnabled) throw new AppError("Online payments are disabled.", "BAD_REQUEST");
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, reference: true, total: true, currency: true, status: true, paymentMethod: true, paymentStatus: true, customerName: true, customerEmail: true, customerPhone: true },
  });
  if (!appt) throw new AppError("Appointment not found.", "NOT_FOUND");
  if (appt.paymentMethod !== "RAZORPAY") throw new AppError("This booking is set to pay at the salon.", "BAD_REQUEST");
  if (appt.paymentStatus === "PAID") throw new AppError("This booking is already paid.", "CONFLICT");
  if (appt.status !== "PENDING" && appt.status !== "CONFIRMED") throw new AppError("This booking is no longer active.", "BAD_REQUEST");
  if (appt.total.lte(0)) throw new AppError("Nothing to pay for this booking.", "BAD_REQUEST");

  // Idempotency: re-use an open order for the same amount instead of creating duplicates.
  const open = await prisma.payment.findFirst({
    where: { appointmentId: appt.id, method: "RAZORPAY", status: "PENDING", amount: appt.total, razorpayOrderId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  let orderId = open?.razorpayOrderId ?? null;
  if (!orderId) {
    const order = await razorpay().orders.create({
      amount: toPaise(appt.total),
      currency: appt.currency,
      receipt: appt.reference,
      notes: { appointmentId: appt.id, reference: appt.reference },
    });
    orderId = order.id;
    await prisma.payment.create({
      data: { appointmentId: appt.id, method: "RAZORPAY", status: "PENDING", amount: appt.total, currency: appt.currency, razorpayOrderId: order.id },
    });
    await audit({ actorId, action: "payment.order.create", entityType: "Payment", entityId: order.id, metadata: { appointmentId: appt.id } });
  }

  return {
    keyId: env.razorpay.keyId!,
    orderId,
    amount: toPaise(appt.total),
    currency: appt.currency,
    name: settings.salonName,
    description: `Booking ${appt.reference}`,
    prefill: { name: appt.customerName, email: appt.customerEmail, contact: appt.customerPhone },
  };
}

/**
 * Marks a payment as captured. Idempotent and amount-checked: safe to call from both the
 * checkout callback and the webhook, in any order, any number of times.
 */
export async function markOrderPaid(params: { orderId: string; paymentId: string; amountPaise?: number; source: "checkout" | "webhook" }) {
  const outcome = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayOrderId: params.orderId },
      include: { appointment: { select: { id: true, total: true, status: true } } },
    });
    if (!payment) throw new AppError("Unknown payment order.", "NOT_FOUND");
    const active = payment.appointment.status === "PENDING" || payment.appointment.status === "CONFIRMED";
    if (payment.status === "PAID") return { appointmentId: payment.appointmentId, paymentId: payment.id, alreadyProcessed: true, active };
    if (!payment.amount.equals(payment.appointment.total)) throw new AppError("Payment amount mismatch.", "CONFLICT");
    if (params.amountPaise !== undefined && params.amountPaise !== toPaise(payment.amount)) throw new AppError("Payment amount mismatch.", "CONFLICT");

    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: { status: "PAID", razorpayPaymentId: params.paymentId, paidAt: new Date(), failureReason: null },
    });
    if (updated.count === 0) return { appointmentId: payment.appointmentId, paymentId: payment.id, alreadyProcessed: true, active };

    const settings = await tx.salonSettings.findUnique({ where: { id: 1 }, select: { autoConfirmBookings: true } });
    await tx.appointment.update({
      where: { id: payment.appointmentId },
      data: {
        paymentStatus: "PAID",
        ...(payment.appointment.status === "PENDING" && settings?.autoConfirmBookings ? { status: "CONFIRMED" } : {}),
      },
    });
    await audit({ tx, actorId: null, action: `payment.captured.${params.source}`, entityType: "Payment", entityId: payment.id, metadata: { orderId: params.orderId } });
    return { appointmentId: payment.appointmentId, paymentId: payment.id, alreadyProcessed: false, active };
  });
  if (!outcome.alreadyProcessed) {
    if (outcome.active) await onBookingCreated(outcome.appointmentId);
    else await handleLatePayment(outcome.appointmentId);
  }
  return outcome;
}

/**
 * Money arrived for a booking that is no longer active (usually the 30-minute hold expired).
 * Reinstate it if the slot is still free — the exclusion constraint decides atomically —
 * otherwise refund. A success email is only sent if the booking really exists again.
 */
async function handleLatePayment(appointmentId: string) {
  const settings = await prisma.salonSettings.findUnique({ where: { id: 1 }, select: { autoConfirmBookings: true } });
  try {
    const reinstated = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findUnique({ where: { id: appointmentId }, select: { customerEmail: true, startAt: true, endAt: true } });
      if (!appt) return 0;
      // Same lock and rule as a new booking: one customer cannot hold two overlapping active appointments.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"customer:" + appt.customerEmail}))`;
      const own = await tx.appointment.findFirst({
        where: { id: { not: appointmentId }, customerEmail: appt.customerEmail, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: appt.endAt }, endAt: { gt: appt.startAt } },
        select: { id: true },
      });
      if (own) return 0;
      const res = await tx.appointment.updateMany({
        where: { id: appointmentId, status: "CANCELLED", cancellationReason: HOLD_EXPIRED_REASON },
        data: { status: settings?.autoConfirmBookings ? "CONFIRMED" : "PENDING", cancelledAt: null, cancelledBy: null, cancellationReason: null },
      });
      return res.count;
    });
    if (reinstated === 1) {
      await audit({ actorId: null, action: "booking.reinstated.late_payment", entityType: "Appointment", entityId: appointmentId });
      await onBookingCreated(appointmentId);
      return "reinstated" as const;
    }
  } catch (err) {
    if (!isOverlapViolation(err)) throw err; // slot was taken meanwhile → refund below
  }
  await refundPaidPayments(appointmentId, null, "Payment received after the booking was no longer available");
  return "refunded" as const;
}

/**
 * Returns money held for an inactive (cancelled / rejected / expired) booking. Online payments are
 * refunded through Razorpay automatically; anything that cannot be refunded automatically
 * (salon payments, Razorpay not configured, API error) is flagged to admins as "refund required".
 */
export async function refundPaidPayments(appointmentId: string, actorId: string | null, reason: string) {
  const paid = await prisma.payment.findMany({ where: { appointmentId, status: "PAID" }, include: { appointment: { select: { reference: true } } } });
  const manual: string[] = [];
  let refunded = 0;
  for (const p of paid) {
    if (p.method === "RAZORPAY" && integrations.razorpay) {
      try {
        await refundPayment(p.id, actorId);
        refunded++;
        continue;
      } catch (err) {
        console.error("[payments] automatic refund failed", err);
      }
    }
    manual.push(p.id);
  }
  if (manual.length) {
    const ref = paid[0]?.appointment.reference ?? "";
    await audit({ actorId, action: "payment.refund_required", entityType: "Appointment", entityId: appointmentId, metadata: { reason, payments: manual } });
    await notifyUsers(await adminUserIds(), {
      type: "PAYMENT_RECEIVED",
      title: `Refund required: ${ref}`,
      body: `${reason}. Refund ${manual.length} payment(s) from the booking page.`,
      link: `/admin/bookings/${appointmentId}`,
    });
  }
  return { refunded, manual: manual.length };
}

export async function markOrderFailed(orderId: string, reason: string) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment || payment.status === "PAID") return;
    await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: reason.slice(0, 500) } });
    await tx.appointment.updateMany({ where: { id: payment.appointmentId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "FAILED" } });
  });
}

/** Verifies the Checkout handler response server-side before trusting it. */
export async function verifyCheckoutPayment(params: { appointmentId: string; orderId: string; paymentId: string; signature: string }) {
  if (!verifyCheckoutSignature(params.orderId, params.paymentId, params.signature)) {
    throw new AppError("Payment verification failed.", "BAD_REQUEST");
  }
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: params.orderId }, select: { appointmentId: true } });
  if (!payment || payment.appointmentId !== params.appointmentId) throw new AppError("Payment does not match this booking.", "BAD_REQUEST");

  // Confirm with Razorpay that the payment is captured/authorized for this order and amount.
  if (integrations.razorpay) {
    const rp = await razorpay().payments.fetch(params.paymentId);
    if (rp.order_id !== params.orderId || !["captured", "authorized"].includes(String(rp.status))) {
      throw new AppError("Payment has not been completed.", "BAD_REQUEST");
    }
    return markOrderPaid({ orderId: params.orderId, paymentId: params.paymentId, amountPaise: Number(rp.amount), source: "checkout" });
  }
  return markOrderPaid({ orderId: params.orderId, paymentId: params.paymentId, source: "checkout" });
}

/** Record a cash/card payment taken at the salon (admin only). */
export async function recordSalonPayment(appointmentId: string, actorId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, total: true, paymentStatus: true, status: true } });
  if (!appt) throw new AppError("Appointment not found.", "NOT_FOUND");
  if (appt.paymentStatus === "PAID") throw new AppError("This booking is already paid.", "CONFLICT");
  if (appt.status === "CANCELLED" || appt.status === "REJECTED") throw new AppError("Cannot record payment for an inactive booking.", "VALIDATION");
  if (appt.total.lte(0)) throw new AppError("Nothing to pay.", "VALIDATION");
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({ data: { appointmentId: appt.id, method: "PAY_AT_SALON", status: "PAID", amount: appt.total, paidAt: new Date() } });
    await tx.appointment.update({ where: { id: appt.id }, data: { paymentStatus: "PAID" } });
    await audit({ tx, actorId, action: "payment.salon.record", entityType: "Appointment", entityId: appt.id });
  });
}

/** Refund a captured payment (Razorpay API for online payments, record-only for salon payments). */
export async function refundPayment(paymentId: string, actorId: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new AppError("Payment not found.", "NOT_FOUND");
  if (payment.status !== "PAID") throw new AppError("Only paid payments can be refunded.", "VALIDATION");
  let refundId: string | null = null;
  if (payment.method === "RAZORPAY") {
    if (!payment.razorpayPaymentId) throw new AppError("Missing Razorpay payment id.", "VALIDATION");
    const refund = await razorpay().payments.refund(payment.razorpayPaymentId, { amount: toPaise(payment.amount), notes: { paymentId: payment.id } });
    refundId = refund.id;
  }
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", refundedAt: new Date(), razorpayRefundId: refundId } });
    await tx.appointment.update({ where: { id: payment.appointmentId }, data: { paymentStatus: "REFUNDED" } });
    await audit({ tx, actorId, action: "payment.refund", entityType: "Payment", entityId: payment.id, metadata: { refundId } });
  });
}
