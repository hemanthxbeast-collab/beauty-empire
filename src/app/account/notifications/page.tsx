import { PageHeader } from "@/components/dashboard/shell";
import { NotificationsList } from "@/components/dashboard/notifications";
import { requireCustomer } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";

export const metadata = { title: "Notifications" };

export default async function AccountNotificationsPage() {
  const user = await requireCustomer();
  const settings = await getSalonSettings();
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsList userId={user.id} timeZone={settings.timezone} />
    </>
  );
}
