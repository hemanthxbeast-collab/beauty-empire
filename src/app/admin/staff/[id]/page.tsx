import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { CreateStaffForm, EditStaffForm } from "@/components/admin/staff-form";
import { AvailabilityEditor, LeaveManager } from "@/components/dashboard/availability-editor";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { dateKeyInTz, dateKeyToDbDate, dbDateToDateKey, minutesToHHMM } from "@/lib/time";

export const metadata = { title: "Staff member" };

export default async function StaffEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const services = (
    await prisma.service.findMany({ orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }], select: { id: true, name: true, category: { select: { name: true } } } })
  ).map((s) => ({ id: s.id, name: s.name, category: s.category.name }));

  if (id === "new") {
    return (
      <>
        <Link href="/admin/staff" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
          <ArrowLeft className="size-4" /> Staff
        </Link>
        <PageHeader title="Add staff member" description="Creates a staff login with access to the staff dashboard only." />
        <CreateStaffForm services={services} />
      </>
    );
  }

  const settings = await getSalonSettings();
  const staff = await prisma.staffProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      services: { select: { serviceId: true } },
      availability: true,
      leaves: { where: { endDate: { gte: dateKeyToDbDate(dateKeyInTz(new Date(), settings.timezone)) } }, orderBy: { startDate: "asc" } },
    },
  });
  if (!staff) notFound();

  const days = Array.from({ length: 7 }, (_, d) => {
    const row = staff.availability.find((a) => a.dayOfWeek === d);
    const h = settings.businessHours[String(d)]!;
    return { dayOfWeek: d, isAvailable: row?.isAvailable ?? false, start: minutesToHHMM(row?.startMinute ?? h.open), end: minutesToHHMM(row?.endMinute ?? h.close) };
  });

  return (
    <>
      <Link href="/admin/staff" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> Staff
      </Link>
      <PageHeader title={staff.user.name} description={staff.title} />
      <EditStaffForm
        email={staff.user.email}
        services={services}
        defaults={{
          staffId: staff.id,
          name: staff.user.name,
          phone: staff.user.phone ?? "",
          title: staff.title,
          bio: staff.bio ?? "",
          photoUrl: staff.photoUrl ?? "",
          specialties: staff.specialties,
          yearsOfExperience: staff.yearsOfExperience,
          serviceIds: staff.services.map((s) => s.serviceId),
          isBookable: staff.isBookable,
          isActive: staff.user.isActive,
          displayOrder: staff.displayOrder,
        }}
      />
      <div className="mt-8 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Working hours</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityEditor staffId={staff.id} initial={days} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leave days</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveManager staffId={staff.id} leaves={staff.leaves.map((l) => ({ id: l.id, startDate: dbDateToDateKey(l.startDate), endDate: dbDateToDateKey(l.endDate), reason: l.reason }))} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
