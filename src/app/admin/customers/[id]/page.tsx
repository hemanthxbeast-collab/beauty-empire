import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { PageHeader, StatCard } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { AppointmentList, NoAppointments } from "@/components/dashboard/appointment-list";
import { Stars } from "@/components/site/cards";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { appointmentListSelect } from "@/server/queries/account";
import { setUserActiveAction } from "@/server/actions/admin-ops";
import { formatInTz } from "@/lib/time";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Customer" };

export default async function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: { customerProfile: { include: { preferredStaff: { select: { user: { select: { name: true } } } } } } },
  });
  if (!user) notFound();
  const settings = await getSalonSettings();
  const profileId = user.customerProfile?.id ?? "__none__";
  const [appointments, reviews, spent] = await Promise.all([
    prisma.appointment.findMany({ where: { customerId: profileId }, orderBy: { startAt: "desc" }, take: 50, select: appointmentListSelect }),
    prisma.review.findMany({ where: { customerId: profileId }, orderBy: { createdAt: "desc" }, include: { service: { select: { name: true } } } }),
    prisma.appointment.aggregate({ where: { customerId: profileId, status: "COMPLETED" }, _sum: { total: true }, _count: { _all: true } }),
  ]);
  const p = user.customerProfile;

  return (
    <>
      <Link href="/admin/customers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <PageHeader
        title={user.name}
        description={`Customer since ${formatInTz(user.createdAt, "d MMMM yyyy", settings.timezone)}`}
        actions={
          <ActionButton
            action={setUserActiveAction}
            args={{ userId: user.id, isActive: !user.isActive }}
            variant={user.isActive ? "outline" : "default"}
            confirm={
              user.isActive
                ? { title: `Disable ${user.name}'s account?`, description: "They will be signed out everywhere and cannot sign in until re-enabled. Their bookings are kept.", destructive: true, confirmLabel: "Disable account" }
                : undefined
            }
          >
            {user.isActive ? "Disable account" : "Enable account"}
          </ActionButton>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Bookings" value={appointments.length} />
        <StatCard label="Completed visits" value={spent._count._all} />
        <StatCard label="Lifetime value" value={formatINR(spent._sum.total ?? 0)} accent />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <a href={`mailto:${user.email}`} className="hover:text-magenta">
                  {user.email}
                </a>{" "}
                <Badge variant={user.emailVerified ? "success" : "warning"}>{user.emailVerified ? "verified" : "unverified"}</Badge>
              </p>
              <p>{user.phone ?? "No phone"}</p>
              {!user.isActive && <Badge variant="danger">Account disabled</Badge>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Skin type</dt>
                <dd>{p?.skinType ?? "—"}</dd>
                <dt className="text-muted-foreground">Hair type</dt>
                <dd>{p?.hairType ?? "—"}</dd>
                <dt className="text-muted-foreground">Preferred staff</dt>
                <dd>{p?.preferredStaff?.user.name ?? "—"}</dd>
                <dt className="text-muted-foreground">Marketing</dt>
                <dd>{p?.marketingOptIn ? "Opted in" : "Not opted in"}</dd>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="whitespace-pre-line">{p?.preferences ?? "—"}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Stars rating={r.rating} />
                        <Badge variant="outline">{r.status.toLowerCase()}</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{r.comment}</p>
                      <p className="text-xs text-muted-rose">{r.service?.name}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <h2 className="mb-4 font-serif text-2xl text-charcoal">Booking history</h2>
          <AppointmentList items={appointments} timeZone={settings.timezone} hrefBase="/admin/bookings" empty={<NoAppointments title="No bookings yet" description="This customer hasn't booked yet." />} />
        </div>
      </div>
    </>
  );
}
