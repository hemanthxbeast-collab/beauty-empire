import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/server/db";
import { EmptyState } from "@/components/ui/primitives";
import { ActionButton } from "./action-button";
import { markNotificationsReadAction } from "@/server/actions/notifications";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/utils";

export async function NotificationsList({ userId, timeZone }: { userId: string; timeZone: string }) {
  const items = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
  const unread = items.filter((i) => !i.readAt).length;
  if (!items.length) return <EmptyState icon={<Bell className="size-5" />} title="No notifications yet" description="Updates about bookings and activity will appear here." />;
  return (
    <div>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <ActionButton action={markNotificationsReadAction} variant="outline" size="sm">
            Mark all as read
          </ActionButton>
        </div>
      )}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {items.map((n) => (
          <li key={n.id} className={cn("flex gap-4 p-5", !n.readAt && "bg-blush/30")}>
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-magenta")} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-charcoal">
                {n.link ? (
                  <Link href={n.link} className="hover:text-magenta">
                    {n.title}
                  </Link>
                ) : (
                  n.title
                )}
                {!n.readAt && <span className="sr-only"> (unread)</span>}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
            </div>
            <time className="shrink-0 text-xs text-muted-foreground" dateTime={n.createdAt.toISOString()}>
              {formatInTz(n.createdAt, "d MMM, h:mm a", timeZone)}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
