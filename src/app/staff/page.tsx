import { CalendarDays } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/primitives";
import { StaffAppointmentCard, staffAppointmentSelect } from "@/components/staff/appointment-card";
import { requireStaff } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { addDaysToDateKey, dateKeyInTz, formatInTz, zonedToUtc } from "@/lib/time";

export const metadata = { title: "Today" };

export default async function StaffTodayPage() {
  const staff = await requireStaff();
  const settings = await getSalonSettings();
  const tz = settings.timezone;
  const today = dateKeyInTz(new Date(), tz);
  const start = zonedToUtc(today, 0, tz);
  const end = zonedToUtc(addDaysToDateKey(today, 1), 0, tz);
  const weekEnd = zonedToUtc(addDaysToDateKey(today, 7), 0, tz);

  const [todays, upcomingCount, completedThisMonth] = await Promise.all([
    prisma.appointment.findMany({
      where: { staffId: staff.staffProfileId, startAt: { gte: start, lt: end }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW"] } },
      orderBy: { startAt: "asc" },
      select: staffAppointmentSelect,
    }),
    prisma.appointment.count({ where: { staffId: staff.staffProfileId, startAt: { gte: end, lt: weekEnd }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.appointment.count({ where: { staffId: staff.staffProfileId, status: "COMPLETED", startAt: { gte: zonedToUtc(today.slice(0, 8) + "01", 0, tz) } } }),
  ]);
  const remaining = todays.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING").length;

  return (
    <>
      <PageHeader title={`Good day, ${staff.name.split(" ")[0]}`} description={formatInTz(new Date(), "EEEE, d MMMM yyyy", tz)} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Today" value={todays.length} hint={`${remaining} remaining`} accent />
        <StatCard label="Next 7 days" value={upcomingCount} />
        <StatCard label="Completed this month" value={completedThisMonth} />
      </div>
      <h2 className="mt-10 mb-4 font-serif text-2xl text-charcoal">Today&apos;s schedule</h2>
      {todays.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="No appointments today" description="Enjoy the calm — new bookings will appear here automatically." />
      ) : (
        <div className="space-y-3">
          {todays.map((a) => (
            <StaffAppointmentCard key={a.id} a={a} timeZone={tz} />
          ))}
        </div>
      )}
    </>
  );
}
