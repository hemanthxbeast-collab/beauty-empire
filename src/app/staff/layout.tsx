import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { unreadCount } from "@/components/dashboard/notifications";
import { requirePageUser } from "@/server/session";

export const metadata: Metadata = { title: { default: "Staff", template: "%s · Staff · Beauty Empire" }, robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/staff", ["STAFF"]);
  const unread = await unreadCount(user.id);
  return (
    <DashboardShell
      title="Staff"
      user={{ name: user.name, email: user.email, roleLabel: "Beauty professional" }}
      unread={unread}
      nav={[
        { href: "/staff", label: "Today", icon: "dashboard", exact: true },
        { href: "/staff/appointments", label: "My appointments", icon: "calendar" },
        { href: "/staff/availability", label: "Availability", icon: "clock" },
        { href: "/staff/profile", label: "Profile", icon: "user" },
        { href: "/staff/notifications", label: "Notifications", icon: "bell", badge: unread || undefined },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
