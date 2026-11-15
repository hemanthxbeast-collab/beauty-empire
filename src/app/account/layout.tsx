import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { unreadCount } from "@/components/dashboard/notifications";
import { prisma } from "@/server/db";
import { requirePageUser } from "@/server/session";

export const metadata: Metadata = { title: { default: "My Account", template: "%s · My Account · Beauty Empire" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/account", ["CUSTOMER"]);

  // Link guest bookings made with this (verified) email address to the account.
  if (user.customerProfileId) {
    await prisma.appointment.updateMany({
      where: { customerId: null, customerEmail: user.email.toLowerCase() },
      data: { customerId: user.customerProfileId },
    });
  }
  const unread = await unreadCount(user.id);

  return (
    <DashboardShell
      title="My Account"
      user={{ name: user.name, email: user.email, roleLabel: user.email }}
      unread={unread}
      nav={[
        { href: "/account", label: "Overview", icon: "dashboard", exact: true },
        { href: "/account/appointments", label: "My appointments", icon: "calendar" },
        { href: "/account/reviews", label: "My reviews", icon: "star" },
        { href: "/account/profile", label: "Profile & preferences", icon: "user" },
        { href: "/account/notifications", label: "Notifications", icon: "bell", badge: unread || undefined },
        { href: "/book", label: "Book appointment", icon: "calendarCheck" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
