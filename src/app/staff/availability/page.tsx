import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { AvailabilityEditor, LeaveManager } from "@/components/dashboard/availability-editor";
import { requireStaff } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { dateKeyInTz, dateKeyToDbDate, dbDateToDateKey, minutesToHHMM } from "@/lib/time";

export const metadata = { title: "Availability" };

export default async function StaffAvailabilityPage() {
  const staff = await requireStaff();
  const settings = await getSalonSettings();
  const [availability, leaves] = await Promise.all([
    prisma.staffAvailability.findMany({ where: { staffId: staff.staffProfileId } }),
    prisma.staffLeave.findMany({ where: { staffId: staff.staffProfileId, endDate: { gte: dateKeyToDbDate(dateKeyInTz(new Date(), settings.timezone)) } }, orderBy: { startDate: "asc" } }),
  ]);
  const days = Array.from({ length: 7 }, (_, d) => {
    const row = availability.find((a) => a.dayOfWeek === d);
    const h = settings.businessHours[String(d)]!;
    return { dayOfWeek: d, isAvailable: row?.isAvailable ?? false, start: minutesToHHMM(row?.startMinute ?? h.open), end: minutesToHHMM(row?.endMinute ?? h.close) };
  });
  return (
    <>
      <PageHeader title="Availability" description="Set your weekly working hours and add leave. Existing bookings are not changed automatically." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly working hours</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityEditor initial={days} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveManager leaves={leaves.map((l) => ({ id: l.id, startDate: dbDateToDateKey(l.startDate), endDate: dbDateToDateKey(l.endDate), reason: l.reason }))} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
