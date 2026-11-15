import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/shell";
import { AppointmentList, NoAppointments } from "@/components/dashboard/appointment-list";
import { requireCustomer } from "@/server/session";
import { getCustomerAppointments } from "@/server/queries/account";
import { getSalonSettings } from "@/server/services/settings";
import { cn } from "@/lib/utils";

export const metadata = { title: "My appointments" };

export default async function MyAppointmentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const scope = tab === "past" ? "past" : "upcoming";
  const user = await requireCustomer();
  const [settings, items] = await Promise.all([getSalonSettings(), getCustomerAppointments(user.customerProfileId, scope)]);

  return (
    <>
      <PageHeader
        title="My appointments"
        description="View, cancel or request to reschedule your bookings."
        actions={
          <Button asChild>
            <Link href="/book">Book appointment</Link>
          </Button>
        }
      />
      <div role="tablist" aria-label="Appointment filter" className="mb-6 inline-flex rounded-full border border-border bg-white p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <Link
            key={t}
            role="tab"
            aria-selected={scope === t}
            href={`/account/appointments${t === "past" ? "?tab=past" : ""}`}
            className={cn("rounded-full px-5 py-2 text-sm capitalize transition", scope === t ? "bg-magenta text-white" : "text-charcoal/70 hover:text-magenta")}
          >
            {t === "past" ? "Past & history" : "Upcoming"}
          </Link>
        ))}
      </div>
      <AppointmentList
        items={items}
        timeZone={settings.timezone}
        hrefBase="/account/appointments"
        empty={
          <NoAppointments
            title={scope === "upcoming" ? "No upcoming appointments" : "No past appointments yet"}
            description={scope === "upcoming" ? "When you book, your appointments will appear here." : "Your booking history will appear here."}
            action={
              scope === "upcoming" ? (
                <Button asChild>
                  <Link href="/book">Book now</Link>
                </Button>
              ) : undefined
            }
          />
        }
      />
    </>
  );
}
