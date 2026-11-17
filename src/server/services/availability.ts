import "server-only";
import { prisma } from "@/server/db";
import { AppError } from "@/server/errors";
import { getSalonSettings } from "@/server/services/settings";
import { computeSlots, type Slot, type StaffDayInput } from "@/lib/booking/slots";
import { addDaysToDateKey, dateKeyInTz, dateKeyToDbDate, dayOfWeekForDateKey, formatMinuteOfDay, zonedToUtc } from "@/lib/time";
import { BLOCKING_STATUSES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

/** Unpaid online-payment bookings hold a slot only for this long. */
export const PAYMENT_HOLD_MINUTES = 30;
/** Cancellation reason used when an unpaid online booking's hold expires (lets a late payment reinstate it). */
export const HOLD_EXPIRED_REASON = "Online payment was not completed in time.";

export async function releaseExpiredPaymentHolds(client: Prisma.TransactionClient | typeof prisma = prisma) {
  const cutoff = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60_000);
  const result = await client.appointment.updateMany({
    where: {
      status: "PENDING",
      paymentMethod: "RAZORPAY",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      createdAt: { lt: cutoff },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: HOLD_EXPIRED_REASON,
    },
  });
  return result.count;
}

export type BookableService = {
  id: string;
  name: string;
  price: Prisma.Decimal;
  discountPrice: Prisma.Decimal | null;
  durationMinutes: number;
  staff: { staffId: string }[];
};

/** Loads active services in the requested order; throws if any are missing or inactive. */
export async function loadBookableServices(serviceIds: string[]): Promise<BookableService[]> {
  const unique = [...new Set(serviceIds)];
  const services = await prisma.service.findMany({
    where: { id: { in: unique }, status: "ACTIVE", category: { isActive: true } },
    select: { id: true, name: true, price: true, discountPrice: true, durationMinutes: true, staff: { select: { staffId: true } } },
  });
  if (services.length !== unique.length) throw new AppError("One or more selected services are no longer available.", "VALIDATION");
  const byId = new Map(services.map((s) => [s.id, s]));
  return unique.map((id) => byId.get(id)!);
}

/** Staff who can perform every selected service. A service with no explicit assignment can be performed by anyone. */
export async function eligibleStaffIds(services: BookableService[], restrictTo?: string): Promise<string[]> {
  const staff = await prisma.staffProfile.findMany({
    where: { isBookable: true, user: { isActive: true, role: "STAFF" }, ...(restrictTo ? { id: restrictTo } : {}) },
    select: { id: true },
    orderBy: { displayOrder: "asc" },
  });
  return staff
    .map((s) => s.id)
    .filter((staffId) => services.every((svc) => svc.staff.length === 0 || svc.staff.some((x) => x.staffId === staffId)));
}

export function assertDateBookable(dateKey: string, settings: { timezone: string; maxAdvanceDays: number }, now = new Date()) {
  const today = dateKeyInTz(now, settings.timezone);
  const last = addDaysToDateKey(today, settings.maxAdvanceDays);
  if (dateKey < today) throw new AppError("Please choose a date in the future.", "VALIDATION");
  if (dateKey > last) throw new AppError(`Bookings open up to ${settings.maxAdvanceDays} days in advance.`, "VALIDATION");
}

export type AvailabilityResult = {
  date: string;
  durationMinutes: number;
  closed: boolean;
  slots: Array<{ minuteOfDay: number; label: string; startAt: string; staffIds: string[] }>;
};

/** Core availability computation shared by the public API, booking and rescheduling. */
export async function computeAvailability(params: {
  serviceIds: string[];
  staffId: string | "any";
  date: string;
  excludeAppointmentId?: string;
  now?: Date;
  ignoreLeadTime?: boolean;
}): Promise<{ result: AvailabilityResult; rawSlots: Slot[]; services: BookableService[] }> {
  const settings = await getSalonSettings();
  const now = params.now ?? new Date();
  assertDateBookable(params.date, settings, now);
  await releaseExpiredPaymentHolds();

  const services = await loadBookableServices(params.serviceIds);
  const durationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const staffIds = await eligibleStaffIds(services, params.staffId === "any" ? undefined : params.staffId);

  const weekday = dayOfWeekForDateKey(params.date);
  const dayHours = settings.businessHours[String(weekday)];
  const dbDate = dateKeyToDbDate(params.date);
  const dayStart = zonedToUtc(params.date, 0, settings.timezone);
  const dayEnd = zonedToUtc(addDaysToDateKey(params.date, 1), 0, settings.timezone);

  const [availability, leaves, busy] = await Promise.all([
    prisma.staffAvailability.findMany({ where: { staffId: { in: staffIds }, dayOfWeek: weekday } }),
    prisma.staffLeave.findMany({ where: { staffId: { in: staffIds }, startDate: { lte: dbDate }, endDate: { gte: dbDate } }, select: { staffId: true } }),
    prisma.appointment.findMany({
      where: {
        staffId: { in: staffIds },
        status: { in: [...BLOCKING_STATUSES] },
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
        ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
      },
      select: { staffId: true, startAt: true, endAt: true },
    }),
  ]);

  const onLeave = new Set(leaves.map((l) => l.staffId));
  const staffInput: StaffDayInput[] = staffIds.map((id) => {
    const row = availability.find((a) => a.staffId === id);
    return {
      id,
      availability: row ? { startMinute: row.startMinute, endMinute: row.endMinute, isAvailable: row.isAvailable } : null,
      onLeave: onLeave.has(id),
      busy: busy.filter((b) => b.staffId === id),
    };
  });

  const rawSlots = computeSlots({
    dateKey: params.date,
    timeZone: settings.timezone,
    dayHours,
    durationMinutes,
    slotIntervalMinutes: settings.slotIntervalMinutes,
    bufferMinutes: settings.bufferMinutes,
    minLeadTimeMinutes: params.ignoreLeadTime ? 0 : settings.minLeadTimeMinutes,
    now,
    staff: staffInput,
  });

  return {
    services,
    rawSlots,
    result: {
      date: params.date,
      durationMinutes,
      closed: !dayHours || dayHours.closed,
      slots: rawSlots.map((s) => ({
        minuteOfDay: s.minuteOfDay,
        label: formatMinuteOfDay(s.minuteOfDay),
        startAt: s.startAt.toISOString(),
        staffIds: s.staffIds,
      })),
    },
  };
}
