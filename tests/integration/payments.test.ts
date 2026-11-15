import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { markOrderPaid, recordSalonPayment, verifyCheckoutPayment } from "@/server/services/payments";
import { releaseExpiredPaymentHolds } from "@/server/services/availability";
import { Prisma } from "@/generated/prisma/client";
import { resetData, seedBasics } from "./fixtures";

let f: Awaited<ReturnType<typeof seedBasics>>;

/** An online-payment booking with an open Razorpay order, created directly in the DB. */
let slotOffset = 0;
async function onlineBooking(orderId = "order_TEST123", amount = 2500) {
  // Each fixture booking gets its own hour so the overlap constraint is not triggered.
  const start = new Date(Date.now() + 5 * 86_400_000 + slotOffset++ * 2 * 3_600_000);
  const appt = await prisma.appointment.create({
    data: {
      reference: `BE-ONL${Math.floor(Math.random() * 90000 + 10000)}`,
      staffId: f.staffA.id,
      startAt: start,
      endAt: new Date(start.getTime() + 3_600_000),
      status: "PENDING",
      customerName: "Payer",
      customerEmail: "payer@example.test",
      customerPhone: "+919812345678",
      subtotal: new Prisma.Decimal(amount),
      total: new Prisma.Decimal(amount),
      paymentMethod: "RAZORPAY",
      paymentStatus: "PENDING",
    },
  });
  await prisma.payment.create({ data: { appointmentId: appt.id, method: "RAZORPAY", status: "PENDING", amount: new Prisma.Decimal(amount), razorpayOrderId: orderId } });
  return appt;
}

beforeEach(async () => {
  await resetData();
  f = await seedBasics();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Scenario 10 — payment status updates only after verified confirmation", () => {
  it("rejects a forged checkout signature and leaves the booking unpaid", async () => {
    const appt = await onlineBooking();
    await expect(
      verifyCheckoutPayment({ appointmentId: appt.id, orderId: "order_TEST123", paymentId: "pay_FAKE", signature: "0".repeat(64) }),
    ).rejects.toThrow(/verification failed/);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id }, include: { payments: true } });
    expect(after.paymentStatus).toBe("PENDING");
    expect(after.payments[0]!.status).toBe("PENDING");
  });

  it("rejects a valid-looking signature for a different booking", async () => {
    const other = await onlineBooking("order_OTHER");
    const mine = await onlineBooking("order_MINE");
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
    const { env } = await import("@/server/env");
    env.razorpay.keySecret = "rzp_test_secret";
    const sig = createHmac("sha256", "rzp_test_secret").update("order_OTHER|pay_1").digest("hex");
    await expect(verifyCheckoutPayment({ appointmentId: mine.id, orderId: "order_OTHER", paymentId: "pay_1", signature: sig })).rejects.toThrow(/does not match/);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: other.id } })).paymentStatus).toBe("PENDING");
    env.razorpay.keySecret = undefined;
  });

  it("marks paid exactly once (idempotent) and rejects amount mismatches", async () => {
    const appt = await onlineBooking("order_IDEM", 2500);
    await expect(markOrderPaid({ orderId: "order_IDEM", paymentId: "pay_A", amountPaise: 100, source: "webhook" })).rejects.toThrow(/mismatch/);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).paymentStatus).toBe("PENDING");

    const results = await Promise.all([
      markOrderPaid({ orderId: "order_IDEM", paymentId: "pay_A", amountPaise: 250000, source: "checkout" }),
      markOrderPaid({ orderId: "order_IDEM", paymentId: "pay_A", amountPaise: 250000, source: "webhook" }),
    ]);
    expect(results.filter((r) => !r.alreadyProcessed)).toHaveLength(1);
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id }, include: { payments: true } });
    expect(after.paymentStatus).toBe("PAID");
    expect(after.payments.filter((p) => p.status === "PAID")).toHaveLength(1);
  });

  it("rejects unknown orders", async () => {
    await expect(markOrderPaid({ orderId: "order_UNKNOWN", paymentId: "pay_X", source: "webhook" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("releases slots held by abandoned online payments after 30 minutes", async () => {
    const appt = await onlineBooking("order_OLD");
    await prisma.appointment.update({ where: { id: appt.id }, data: { createdAt: new Date(Date.now() - 31 * 60_000) } });
    expect(await releaseExpiredPaymentHolds()).toBe(1);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).status).toBe("CANCELLED");
  });

  it("records salon payments once", async () => {
    const start = new Date(Date.now() + 86_400_000);
    const appt = await prisma.appointment.create({
      data: { reference: "BE-SALON001", staffId: f.staffA.id, startAt: start, endAt: new Date(start.getTime() + 3_600_000), status: "CONFIRMED", customerName: "X", customerEmail: "x@example.test", customerPhone: "+919812345678", subtotal: 900, total: 900 },
    });
    await recordSalonPayment(appt.id, f.admin.id);
    await expect(recordSalonPayment(appt.id, f.admin.id)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).paymentStatus).toBe("PAID");
  });
});
