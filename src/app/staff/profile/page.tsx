import Image from "next/image";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { ChangePasswordForm } from "@/components/account/profile-form";
import { requireStaff } from "@/server/session";
import { prisma } from "@/server/db";
import { formatDuration, formatINR, initials } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function StaffProfilePage() {
  const staff = await requireStaff();
  const profile = await prisma.staffProfile.findUniqueOrThrow({
    where: { id: staff.staffProfileId },
    include: { services: { include: { service: { select: { name: true, price: true, durationMinutes: true, status: true } } } } },
  });
  return (
    <>
      <PageHeader title="My profile" description="Contact the salon admin to update your public profile or assigned services." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              {profile.photoUrl ? (
                <Image src={profile.photoUrl} alt="" width={80} height={80} className="size-20 rounded-full object-cover" />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose/60 font-serif text-2xl text-magenta-deep">{initials(staff.name)}</span>
              )}
              <div>
                <p className="font-serif text-2xl text-charcoal">{staff.name}</p>
                <p className="text-sm text-muted-foreground">{profile.title}</p>
                <p className="text-xs text-muted-foreground">
                  {staff.email} · {staff.phone}
                </p>
              </div>
            </div>
            {profile.bio && <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.specialties.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <h2 className="mt-8 mb-3 font-serif text-xl text-charcoal">Assigned services</h2>
            <ul className="divide-y divide-border rounded-xl border border-border text-sm">
              {profile.services.map(({ service }) => (
                <li key={service.name} className="flex justify-between gap-3 px-4 py-2.5">
                  <span>
                    {service.name} {service.status === "INACTIVE" && <Badge variant="neutral">inactive</Badge>}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDuration(service.durationMinutes)} · {formatINR(service.price)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
