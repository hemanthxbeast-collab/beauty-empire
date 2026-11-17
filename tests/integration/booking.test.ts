import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { cancelBookingAsCustomer, createBooking, isOverlapViolation, rescheduleBooking, updateBookingStatus } from "@/server/services/booking";
import { computeAvailability } from "@/server/services/availability";
import { getCustomerAppointment } from "@/server/queries/account";
import { createBookingSchema } from "@/lib/validations/booking";
import { zonedToUtc } from "@/lib/time";
import { bookingInput, futureDate, resetData, seedBasics } from "./fixtures";

let f: Awaited<ReturnType<typeof seedBasics>>;

beforeEach(async () => {
  await resetData();
  f = await seedBasics();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const parse = (o: Parameters<typeof bookingInput>[0]) => createBookingSchema.parse(bookingInput(o));

describe("Scenario 4 — a customer can book an available service", () => {
  it("creates a pending booking with server-side pricing and service snapshots", async () => {
    const date = futureDate();
    const appt = await createBooking(parse({ serviceIds: [f.facial.id, f.cleanup.id], staffId: f.staffA.id, date, minuteOfDay: 660, email: f.customer1.email }), {
      userId: f.customer1.userId,
      customerProfileId: f.customer1.profileId,
    });
    expect(appt.reference).toMatch(/^BE-/);
    const saved = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id }, include: { services: true } });
    expect(saved.status).toBe("PENDING");
    expect(saved.total.toNumber()).toBe(2500 + 800); // discount price is used for Clean-Up
    expect(saved.services).toHaveLength(2);
    expect(saved.endAt.getTime() - saved.startAt.getTime()).toBe(90 * 60_000);
    expect(saved.startAt.toISOString()).toBe(zonedToUtc(date, 660, "Asia/Kolkata").toISOString());
    expect(saved.customerId).toBe(f.customer1.profileId);
  });

  it("auto-confirms pay-at-salon bookings when enabled", async () => {
    await prisma.salonSettings.update({ where: { id: 1 }, data: { autoConfirmBookings: true } });
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    expect(appt.status).toBe("CONFIRMED");
  });

  it("refuses times outside availability, in the past, or with online payment disabled", async () => {
    await expect(createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 1230 }), { userId: null, customerProfileId: null })).rejects.toThrow(/no longer available/);
    await expect(createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(-1), minuteOfDay: 600 }), { userId: null, customerProfileId: null })).rejects.toThrow(/future/);
    await expect(
      createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600, paymentMethod: "RAZORPAY" }), { userId: null, customerProfileId: null }),
    ).rejects.toThrow(/Online payment is not available/);
  });

  it("removes booked times from availability", async () => {
    const date = futureDate();
    await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date, minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    const { result } = await computeAvailability({ serviceIds: [f.facial.id], staffId: f.staffA.id, date });
    const minutes = result.slots.map((s) => s.minuteOfDay);
    expect(minutes).not.toContain(600);
    expect(minutes).not.toContain(630);
    expect(minutes).toContain(660);
  });
});

describe("Scenario 5 — two customers cannot reserve the same staff time slot", () => {
  it("allows exactly one of many concurrent bookings for the same professional and time", async () => {
    const date = futureDate(4);
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date, minuteOfDay: 720, email: `racer${i}@example.test` }), { userId: null, customerProfileId: null }),
      ),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    const failed = attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(5);
    for (const f2 of failed) {
      expect(f2.reason).toBeInstanceOf(AppError);
      expect((f2.reason as AppError).code).toBe("CONFLICT");
    }
    expect(await prisma.appointment.count({ where: { staffId: f.staffA.id, status: { in: ["PENDING", "CONFIRMED"] } } })).toBe(1);
  });

  it("with 'no preference', concurrent bookings are spread across free professionals", async () => {
    const date = futureDate(4);
    const attempts = await Promise.allSettled(
      Array.from({ length: 3 }, (_, i) => createBooking(parse({ serviceIds: [f.facial.id], staffId: "any", date, minuteOfDay: 780, email: `guest${i}@example.test` }), { userId: null, customerProfileId: null })),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(2); // two professionals
    const staffUsed = await prisma.appointment.findMany({ where: { status: "PENDING" }, select: { staffId: true } });
    expect(new Set(staffUsed.map((s) => s.staffId)).size).toBe(2);
  });

  it("is enforced by the database itself (exclusion constraint), even bypassing app logic", async () => {
    const start = zonedToUtc(futureDate(5), 600, "Asia/Kolkata");
    const base = {
      staffId: f.staffA.id,
      customerName: "X",
      customerEmail: "x@example.test",
      customerPhone: "+919812345678",
      subtotal: 1,
      total: 1,
      status: "CONFIRMED" as const,
    };
    await prisma.appointment.create({ data: { ...base, reference: "BE-AAAAAAA1", startAt: start, endAt: new Date(start.getTime() + 3_600_000) } });
    const err = await prisma.appointment
      .create({ data: { ...base, reference: "BE-AAAAAAA2", startAt: new Date(start.getTime() + 1_800_000), endAt: new Date(start.getTime() + 5_400_000) } })
      .catch((e: unknown) => e);
    expect(isOverlapViolation(err)).toBe(true);
    // A cancelled booking does not block the slot.
    await prisma.appointment.updateMany({ where: { reference: "BE-AAAAAAA1" }, data: { status: "CANCELLED" } });
    await expect(prisma.appointment.create({ data: { ...base, reference: "BE-AAAAAAA3", startAt: start, endAt: new Date(start.getTime() + 3_600_000) } })).resolves.toBeTruthy();
  });
});

describe("Duplicate submission (double click / retry)", () => {
  it("the same customer cannot be booked twice at the same time, even with 'no preference'", async () => {
    const date = futureDate(4);
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, () => createBooking(parse({ serviceIds: [f.facial.id], staffId: "any", date, minuteOfDay: 840, email: "same@example.test" }), { userId: null, customerProfileId: null })),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(rejected.every((r) => (r.reason as AppError).code === "CONFLICT")).toBe(true);
    expect(await prisma.appointment.count({ where: { customerEmail: "same@example.test" } })).toBe(1);
  });

  it("a replayed idempotency key returns the original booking instead of creating another", async () => {
    const key = "2f0f3a6e-1c4b-4d7a-9a51-7f2e0c1d9b10";
    const input = parse({ serviceIds: [f.facial.id], staffId: "any", date: futureDate(4), minuteOfDay: 900, email: "retry@example.test", idempotencyKey: key });
    const [a, b] = await Promise.all([createBooking(input, { userId: null, customerProfileId: null }), createBooking(input, { userId: null, customerProfileId: null })]);
    expect(a.reference).toBe(b.reference);
    const c = await createBooking(input, { userId: null, customerProfileId: null });
    expect(c.reference).toBe(a.reference);
    expect(await prisma.appointment.count({ where: { customerEmail: "retry@example.test" } })).toBe(1);
  });

  it("a replayed key with different contact details is refused (no data leak)", async () => {
    const key = "7c9e2b1a-5d3f-4e6a-8b2c-1a2b3c4d5e6f";
    await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(4), minuteOfDay: 600, email: "owner@example.test", idempotencyKey: key }), { userId: null, customerProfileId: null });
    await expect(
      createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffB.id, date: futureDate(4), minuteOfDay: 600, email: "other@example.test", idempotencyKey: key }), { userId: null, customerProfileId: null }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("Scenario 6 — a customer cannot access another customer's bookings", () => {
  it("hides and protects other customers' appointments", async () => {
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600, email: f.customer1.email }), {
      userId: f.customer1.userId,
      customerProfileId: f.customer1.profileId,
    });
    expect(await getCustomerAppointment(f.customer1.profileId, appt.id)).not.toBeNull();
    expect(await getCustomerAppointment(f.customer2.profileId, appt.id)).toBeNull();
    await expect(cancelBookingAsCustomer({ appointmentId: appt.id, customerProfileId: f.customer2.profileId, userId: f.customer2.userId })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).status).toBe("PENDING");
  });
});

describe("Scenario 7 & 8 — staff vs admin booking management", () => {
  async function confirmedPastAppointment(staffId: string) {
    const start = new Date(Date.now() - 2 * 3_600_000);
    return prisma.appointment.create({
      data: {
        reference: `BE-PAST${Math.floor(Math.random() * 9000 + 1000)}`,
        staffId,
        startAt: start,
        endAt: new Date(start.getTime() + 3_600_000),
        status: "CONFIRMED",
        customerName: "X",
        customerEmail: "x@example.test",
        customerPhone: "+919812345678",
        subtotal: 1000,
        total: 1000,
      },
    });
  }

  it("admin can confirm, reschedule and cancel bookings", async () => {
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    const admin = { id: f.admin.id, role: "ADMIN" as const };
    await updateBookingStatus({ appointmentId: appt.id, status: "CONFIRMED", actor: admin });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).status).toBe("CONFIRMED");

    await rescheduleBooking({ appointmentId: appt.id, date: futureDate(6), minuteOfDay: 840, staffId: f.staffB.id, actorId: admin.id });
    const moved = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(moved.staffId).toBe(f.staffB.id);
    expect(moved.startAt.toISOString()).toBe(zonedToUtc(futureDate(6), 840, "Asia/Kolkata").toISOString());

    await updateBookingStatus({ appointmentId: appt.id, status: "CANCELLED", reason: "Salon closed", actor: admin });
    const cancelled = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledBy).toBe("ADMIN");
    expect(await prisma.auditLog.count({ where: { entityId: appt.id } })).toBeGreaterThanOrEqual(3);
  });

  it("admin reschedule refuses a time that clashes with another booking", async () => {
    const date = futureDate();
    const a = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date, minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date, minuteOfDay: 720 }), { userId: null, customerProfileId: null });
    await expect(rescheduleBooking({ appointmentId: a.id, date, minuteOfDay: 720, actorId: f.admin.id })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("invalid transitions are rejected", async () => {
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    await expect(updateBookingStatus({ appointmentId: appt.id, status: "COMPLETED", actor: { id: f.admin.id, role: "ADMIN" } })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("staff cannot perform admin-only operations or touch other staff's bookings", async () => {
    const pending = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    const staffA = { id: f.staffA.userId, role: "STAFF" as const, staffProfileId: f.staffA.id };
    const staffB = { id: f.staffB.userId, role: "STAFF" as const, staffProfileId: f.staffB.id };
    // Confirming / cancelling is admin-only.
    await expect(updateBookingStatus({ appointmentId: pending.id, status: "CONFIRMED", actor: staffA })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(updateBookingStatus({ appointmentId: pending.id, status: "CANCELLED", actor: staffA })).rejects.toMatchObject({ code: "VALIDATION" });

    const past = await confirmedPastAppointment(f.staffA.id);
    await expect(updateBookingStatus({ appointmentId: past.id, status: "COMPLETED", actor: staffB })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await updateBookingStatus({ appointmentId: past.id, status: "COMPLETED", actor: staffA });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: past.id } })).status).toBe("COMPLETED");
  });

  it("customers have no status-transition rights at all", async () => {
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(), minuteOfDay: 600 }), { userId: null, customerProfileId: null });
    await expect(updateBookingStatus({ appointmentId: appt.id, status: "CONFIRMED", actor: { id: f.customer1.userId, role: "CUSTOMER" } })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("Scenario 9 — customer cancellation follows the booking policy", () => {
  it("allows cancellation well in advance and frees the slot", async () => {
    const date = futureDate(5);
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date, minuteOfDay: 600 }), { userId: f.customer1.userId, customerProfileId: f.customer1.profileId });
    await cancelBookingAsCustomer({ appointmentId: appt.id, customerProfileId: f.customer1.profileId, userId: f.customer1.userId, reason: "Travel" });
    const after = await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } });
    expect(after.status).toBe("CANCELLED");
    expect(after.cancelledBy).toBe("CUSTOMER");
    const { result } = await computeAvailability({ serviceIds: [f.facial.id], staffId: f.staffA.id, date });
    expect(result.slots.map((s) => s.minuteOfDay)).toContain(600);
  });

  it("refuses online cancellation inside the cancellation window", async () => {
    await prisma.salonSettings.update({ where: { id: 1 }, data: { cancellationWindowHours: 24 * 30 } });
    const appt = await createBooking(parse({ serviceIds: [f.facial.id], staffId: f.staffA.id, date: futureDate(3), minuteOfDay: 600 }), { userId: f.customer1.userId, customerProfileId: f.customer1.profileId });
    await expect(cancelBookingAsCustomer({ appointmentId: appt.id, customerProfileId: f.customer1.profileId, userId: f.customer1.userId })).rejects.toThrow(/in advance/);
  });
});
