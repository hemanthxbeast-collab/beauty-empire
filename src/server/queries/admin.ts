import "server-only";
import { prisma } from "@/server/db";
import { addDaysToDateKey, dateKeyInTz, formatInTz, zonedToUtc } from "@/lib/time";
import { toNumber } from "@/lib/utils";

export async function getDashboardData(timeZone: string) {
  const now = new Date();
  const today = dateKeyInTz(now, timeZone);
  const dayStart = zonedToUtc(today, 0, timeZone);
  const dayEnd = zonedToUtc(addDaysToDateKey(today, 1), 0, timeZone);
  const weeksAgo8 = zonedToUtc(addDaysToDateKey(today, -55), 0, timeZone);
  const monthsAgo6 = zonedToUtc(addDaysToDateKey(today, -183), 0, timeZone);
  const days30 = zonedToUtc(addDaysToDateKey(today, -29), 0, timeZone);

  const [total, todayCount, byStatus, customers, revenue, recent, popular, apptsForWeeks, paymentsForMonths, created30, pendingReschedules, newMessages, pendingReviews] =
    await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { startAt: { gte: dayStart, lt: dayEnd }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } } }),
      prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      prisma.appointment.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, reference: true, customerName: true, startAt: true, status: true, total: true, staff: { select: { user: { select: { name: true } } } }, services: { select: { serviceName: true }, orderBy: { sortOrder: "asc" } } },
      }),
      prisma.appointmentService.groupBy({
        by: ["serviceName"],
        where: { appointment: { status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] }, startAt: { gte: monthsAgo6 } } },
        _count: { _all: true },
        orderBy: { _count: { serviceName: "desc" } },
        take: 8,
      }),
      prisma.appointment.findMany({ where: { startAt: { gte: weeksAgo8, lt: dayEnd } }, select: { startAt: true, status: true } }),
      prisma.payment.findMany({ where: { status: "PAID", paidAt: { gte: monthsAgo6 } }, select: { paidAt: true, amount: true } }),
      prisma.appointment.findMany({ where: { createdAt: { gte: days30 } }, select: { createdAt: true } }),
      prisma.appointment.count({ where: { rescheduleRequestedAt: { not: null }, status: { in: ["PENDING", "CONFIRMED"] } } }),
      prisma.contactMessage.count({ where: { status: "NEW" } }),
      prisma.review.count({ where: { status: "PENDING" } }),
    ]);

  const status = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;

  // Weekly appointments (last 8 weeks, Monday-start buckets)
  const weekly: Array<{ label: string; value: number }> = [];
  for (let w = 7; w >= 0; w--) {
    const end = addDaysToDateKey(today, -w * 7 + 1);
    const start = addDaysToDateKey(end, -7);
    const s = zonedToUtc(start, 0, timeZone).getTime();
    const e = zonedToUtc(end, 0, timeZone).getTime();
    weekly.push({
      label: formatInTz(new Date(s), "d MMM", timeZone),
      value: apptsForWeeks.filter((a) => a.startAt.getTime() >= s && a.startAt.getTime() < e && a.status !== "CANCELLED" && a.status !== "REJECTED").length,
    });
  }

  // Monthly revenue (last 6 months)
  const monthly = new Map<string, number>();
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - m);
    monthly.set(formatInTz(d, "MMM yyyy", timeZone), 0);
  }
  for (const p of paymentsForMonths) {
    const key = formatInTz(p.paidAt!, "MMM yyyy", timeZone);
    if (monthly.has(key)) monthly.set(key, monthly.get(key)! + toNumber(p.amount));
  }

  // Booking trend (bookings created per day, last 30 days)
  const trend: Array<{ label: string; value: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const key = addDaysToDateKey(today, -i);
    trend.push({ label: formatInTz(zonedToUtc(key, 720, timeZone), "d MMM", timeZone), value: created30.filter((a) => dateKeyInTz(a.createdAt, timeZone) === key).length });
  }

  return {
    stats: {
      total,
      today: todayCount,
      pending: status("PENDING"),
      confirmed: status("CONFIRMED"),
      completed: status("COMPLETED"),
      customers,
      revenue: toNumber(revenue._sum.amount ?? 0),
      pendingReschedules,
      newMessages,
      pendingReviews,
    },
    weekly,
    monthly: [...monthly.entries()].map(([label, value]) => ({ label: label.split(" ")[0]!, value })),
    popular: popular.map((p) => ({ label: p.serviceName, value: p._count._all })),
    trend,
    recent,
  };
}
