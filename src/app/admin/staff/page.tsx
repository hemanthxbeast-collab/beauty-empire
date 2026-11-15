import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { DAY_NAMES } from "@/lib/constants";
import { addDaysToDateKey, dateKeyInTz, zonedToUtc } from "@/lib/time";
import { initials } from "@/lib/utils";

export const metadata = { title: "Staff" };

export default async function AdminStaffPage() {
  await requireAdmin();
  const settings = await getSalonSettings();
  const today = dateKeyInTz(new Date(), settings.timezone);
  const start = zonedToUtc(today, 0, settings.timezone);
  const end = zonedToUtc(addDaysToDateKey(today, 1), 0, settings.timezone);
  const staff = await prisma.staffProfile.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      user: { select: { name: true, email: true, isActive: true } },
      availability: { where: { isAvailable: true }, select: { dayOfWeek: true } },
      _count: { select: { services: true, appointments: { where: { startAt: { gte: start, lt: end }, status: { in: ["PENDING", "CONFIRMED"] } } } } },
    },
  });
  return (
    <>
      <PageHeader
        title="Staff"
        description="Manage beauticians, their services, working hours and leave."
        actions={
          <Button asChild>
            <Link href="/admin/staff/new">
              <Plus /> Add staff member
            </Link>
          </Button>
        }
      />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => (
          <li key={s.id}>
            <Link href={`/admin/staff/${s.id}`} className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 transition hover:border-rose hover:shadow-soft">
              <div className="flex items-center gap-4">
                {s.photoUrl ? (
                  <Image src={s.photoUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose/60 font-serif text-lg text-magenta-deep">{initials(s.user.name)}</span>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-charcoal">{s.user.name}</p>
                  <p className="text-xs text-muted-foreground">{s.title}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {!s.user.isActive && <Badge variant="danger">Disabled</Badge>}
                {s.user.isActive && <Badge variant={s.isBookable ? "success" : "neutral"}>{s.isBookable ? "Bookable" : "Not bookable"}</Badge>}
                <Badge variant="outline">{s._count.services} services</Badge>
                <Badge variant="outline">{s._count.appointments} today</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Works:{" "}
                {s.availability
                  .map((a) => a.dayOfWeek)
                  .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
                  .map((d) => DAY_NAMES[d]!.slice(0, 3))
                  .join(", ") || "No days set"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
