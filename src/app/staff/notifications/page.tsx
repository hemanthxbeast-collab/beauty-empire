import { PageHeader } from "@/components/dashboard/shell";
import { NotificationsList } from "@/components/dashboard/notifications";
import { requireStaff } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";

export const metadata = { title: "Notifications" };

export default async function StaffNotificationsPage() {
  const user = await requireStaff();
  const settings = await getSalonSettings();
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsList userId={user.id} timeZone={settings.timezone} />
    </>
  );
}
