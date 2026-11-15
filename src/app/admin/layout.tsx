import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";
import { unreadCount } from "@/components/dashboard/notifications";
import { prisma } from "@/server/db";
import { requirePageUser } from "@/server/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Beauty Empire" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser("/admin", ["ADMIN"]);
  const [unread, pending, pendingReviews, newMessages] = await Promise.all([
    unreadCount(user.id),
    prisma.appointment.count({ where: { status: "PENDING" } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
  ]);
  return (
    <DashboardShell
      title="Admin"
      user={{ name: user.name, email: user.email, roleLabel: "Administrator" }}
      unread={unread}
      nav={[
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/admin/bookings", label: "Bookings", icon: "calendar", badge: pending || undefined },
        { href: "/admin/services", label: "Services & packages", icon: "services" },
        { href: "/admin/categories", label: "Categories", icon: "categories" },
        { href: "/admin/staff", label: "Staff", icon: "team" },
        { href: "/admin/customers", label: "Customers & messages", icon: "users", badge: newMessages || undefined },
        { href: "/admin/gallery", label: "Gallery", icon: "gallery" },
        { href: "/admin/offers", label: "Offers", icon: "offers" },
        { href: "/admin/reviews", label: "Reviews", icon: "reviews", badge: pendingReviews || undefined },
        { href: "/admin/payments", label: "Payments", icon: "payments" },
        { href: "/admin/settings", label: "Settings", icon: "settings" },
        { href: "/admin/notifications", label: "Notifications", icon: "bell", badge: unread || undefined },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
