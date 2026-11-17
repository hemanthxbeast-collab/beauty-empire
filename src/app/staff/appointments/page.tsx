import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/primitives";
import { StaffAppointmentCard, staffAppointmentSelect } from "@/components/staff/appointment-card";
import { requireStaff } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "My appointments" };

export default async function StaffAppointmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff();
  const { tab } = await searchParams;
  const past = tab === "past";
  const settings = await getSalonSettings();
  const now = new Date();
  const items = await prisma.appointment.findMany({
    where: past
      ? { staffId: staff.staffProfileId, OR: [{ endAt: { lt: now } }, { status: { in: ["COMPLETED", "NO_SHOW"] } }], status: { notIn: ["CANCELLED", "REJECTED"] } }
      : { staffId: staff.staffProfileId, endAt: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
    orderBy: { startAt: past ? "desc" : "asc" },
    take: 60,
    select: staffAppointmentSelect,
  });

  // Group by date for scannability
  const groups = new Map<string, typeof items>();
  for (const a of items) {
    const key = formatInTz(a.startAt, "EEEE, d MMMM", settings.timezone);
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  return (
    <>
      <PageHeader title="My appointments" description="Your assigned appointments. Customer details are shown only for your bookings." />
      <nav aria-label="View" className="mb-6 inline-flex rounded-full border border-border bg-white p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <Link
            key={t}
            aria-current={((t === "past") === past) ? "page" : undefined}
            href={t === "past" ? "/staff/appointments?tab=past" : "/staff/appointments"}
            className={cn("rounded-full px-5 py-2 text-sm capitalize transition", (t === "past") === past ? "bg-magenta text-white" : "text-charcoal/70 hover:text-magenta")}
          >
            {t}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title={past ? "No past appointments" : "No upcoming appointments"} />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-rose uppercase">{day}</h2>
              <div className="space-y-3">
                {list.map((a) => (
                  <StaffAppointmentCard key={a.id} a={a} timeZone={settings.timezone} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
