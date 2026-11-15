import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { ChangePasswordForm, ProfileForm } from "@/components/account/profile-form";
import { requireCustomer } from "@/server/session";
import { prisma } from "@/server/db";
import { dbDateToDateKey } from "@/lib/time";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireCustomer();
  const [profile, staff] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { id: user.customerProfileId } }),
    prisma.staffProfile.findMany({ where: { isBookable: true, user: { isActive: true } }, orderBy: { displayOrder: "asc" }, select: { id: true, user: { select: { name: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="Profile & preferences" description="Keep your details up to date for a smoother visit." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm
              email={user.email}
              staff={staff.map((s) => ({ id: s.id, name: s.user.name }))}
              defaults={{
                name: user.name,
                phone: user.phone ?? "",
                dateOfBirth: profile?.dateOfBirth ? dbDateToDateKey(profile.dateOfBirth) : "",
                skinType: profile?.skinType ?? "",
                hairType: profile?.hairType ?? "",
                preferences: profile?.preferences ?? "",
                preferredStaffId: profile?.preferredStaffId ?? "none",
                marketingOptIn: profile?.marketingOptIn ?? false,
              }}
            />
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Password & security</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
