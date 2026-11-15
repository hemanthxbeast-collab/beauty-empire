import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/dashboard/shell";
import { AppointmentList, NoAppointments } from "@/components/dashboard/appointment-list";
import { requireCustomer } from "@/server/session";
import { getCustomerAppointments } from "@/server/queries/account";
import { getSalonSettings } from "@/server/services/settings";
import { prisma } from "@/server/db";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  await searchParams;
  const user = await requireCustomer();
  const [settings, upcoming, stats, spent] = await Promise.all([
    getSalonSettings(),
    getCustomerAppointments(user.customerProfileId, "upcoming"),
    prisma.appointment.groupBy({ by: ["status"], where: { customerId: user.customerProfileId }, _count: { _all: true } }),
    prisma.appointment.aggregate({ where: { customerId: user.customerProfileId, status: "COMPLETED" }, _sum: { total: true } }),
  ]);
  const count = (s: string) => stats.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description="Welcome back to your Beauty Empire account."
        actions={
          <Button asChild>
            <Link href="/book">
              <CalendarCheck /> Book appointment
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Upcoming" value={upcoming.length} accent />
        <StatCard label="Completed visits" value={count("COMPLETED")} />
        <StatCard label="Cancelled" value={count("CANCELLED") + count("REJECTED")} />
        <StatCard label="Total spent" value={formatINR(spent._sum.total ?? 0)} />
      </div>
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-charcoal">Upcoming appointments</h2>
          <Link href="/account/appointments" className="flex items-center gap-1 text-sm text-magenta hover:underline">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <AppointmentList
          items={upcoming.slice(0, 5)}
          timeZone={settings.timezone}
          hrefBase="/account/appointments"
          empty={
            <NoAppointments
              title="No upcoming appointments"
              description="Treat yourself — book your next visit in under a minute."
              action={
                <Button asChild>
                  <Link href="/book">Book now</Link>
                </Button>
              }
            />
          }
        />
      </div>
    </>
  );
}
