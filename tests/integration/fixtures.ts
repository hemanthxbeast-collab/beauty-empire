import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { Prisma } from "@/generated/prisma/client";
import { addDaysToDateKey, dateKeyInTz } from "@/lib/time";

const ALL_DAY = Object.fromEntries(Array.from({ length: 7 }, (_, d) => [String(d), { open: 540, close: 1260, closed: false }]));

export async function resetData() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export async function seedBasics(opts: { autoConfirm?: boolean; cancellationWindowHours?: number; onlinePayments?: boolean } = {}) {
  await prisma.salonSettings.create({
    data: {
      id: 1,
      addressLine1: "1 Test Street",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500001",
      phone: "+919000000000",
      whatsappNumber: "+919000000000",
      email: "salon@example.test",
      timezone: "Asia/Kolkata",
      businessHours: ALL_DAY,
      slotIntervalMinutes: 30,
      minLeadTimeMinutes: 60,
      maxAdvanceDays: 60,
      bufferMinutes: 0,
      autoConfirmBookings: opts.autoConfirm ?? false,
      cancellationWindowHours: opts.cancellationWindowHours ?? 24,
      onlinePaymentsEnabled: opts.onlinePayments ?? false,
      bookingPolicy: "Test booking policy text.",
      cancellationPolicy: "Test cancellation policy text.",
    },
  });
  const category = await prisma.serviceCategory.create({ data: { name: "Facial", slug: "facial" } });
  const facial = await prisma.service.create({
    data: { categoryId: category.id, name: "Gold Facial", slug: "gold-facial", shortDescription: "A gold facial", description: "Gold facial description", price: new Prisma.Decimal(2500), durationMinutes: 60 },
  });
  const cleanup = await prisma.service.create({
    data: { categoryId: category.id, name: "Clean-Up", slug: "clean-up", shortDescription: "A clean up", description: "Clean up description", price: new Prisma.Decimal(900), discountPrice: new Prisma.Decimal(800), durationMinutes: 30 },
  });
  const staffA = await createStaff("Asha Staff", "asha@example.test");
  const staffB = await createStaff("Bina Staff", "bina@example.test");
  const customer1 = await createCustomer("Chitra Customer", "chitra@example.test");
  const customer2 = await createCustomer("Deepa Customer", "deepa@example.test");
  const admin = await prisma.user.create({ data: { id: randomUUID(), name: "Admin", email: "admin@example.test", role: "ADMIN", emailVerified: true } });
  return { facial, cleanup, staffA, staffB, customer1, customer2, admin };
}

async function createStaff(name: string, email: string) {
  const user = await prisma.user.create({ data: { id: randomUUID(), name, email, role: "STAFF", emailVerified: true } });
  const profile = await prisma.staffProfile.create({
    data: {
      userId: user.id,
      slug: email.split("@")[0]!,
      title: "Beautician",
      availability: { create: Array.from({ length: 7 }, (_, d) => ({ dayOfWeek: d, startMinute: 540, endMinute: 1260, isAvailable: true })) },
    },
  });
  return { userId: user.id, id: profile.id };
}

async function createCustomer(name: string, email: string) {
  const user = await prisma.user.create({ data: { id: randomUUID(), name, email, role: "CUSTOMER", emailVerified: true, phone: "+919812345678" } });
  const profile = await prisma.customerProfile.create({ data: { userId: user.id } });
  return { userId: user.id, profileId: profile.id, name, email };
}

/** A bookable date a few days ahead (in salon time). */
export function futureDate(daysAhead = 3) {
  return addDaysToDateKey(dateKeyInTz(new Date(), "Asia/Kolkata"), daysAhead);
}

export function bookingInput(o: { serviceIds: string[]; staffId: string; date: string; minuteOfDay: number; email?: string; paymentMethod?: "PAY_AT_SALON" | "RAZORPAY" }) {
  return {
    serviceIds: o.serviceIds,
    staffId: o.staffId,
    date: o.date,
    minuteOfDay: o.minuteOfDay,
    customer: { name: "Test Customer", email: o.email ?? "guest@example.test", phone: "+919812345678", notes: undefined, specialRequirements: undefined },
    paymentMethod: o.paymentMethod ?? ("PAY_AT_SALON" as const),
    offerId: undefined,
    acceptPolicy: true as const,
  };
}
