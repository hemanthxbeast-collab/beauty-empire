import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { PaymentBadge, StatusBadge } from "./status-badge";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { formatInTz } from "@/lib/time";
import { formatINR } from "@/lib/utils";
import type { AppointmentListItem } from "@/server/queries/account";

export function AppointmentList({ items, timeZone, hrefBase, empty }: { items: AppointmentListItem[]; timeZone: string; hrefBase: string; empty: React.ReactNode }) {
  if (!items.length) return <>{empty}</>;
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id}>
          <Link
            href={`${hrefBase}/${a.id}`}
            className="group flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 transition hover:border-rose hover:shadow-soft sm:flex-row sm:items-center"
          >
            <div className="flex w-20 shrink-0 flex-col items-center rounded-xl bg-blush/70 py-2.5 text-magenta-deep">
              <span className="text-[0.65rem] font-semibold tracking-widest uppercase">{formatInTz(a.startAt, "MMM", timeZone)}</span>
              <span className="font-serif text-3xl leading-none">{formatInTz(a.startAt, "d", timeZone)}</span>
              <span className="text-[0.65rem]">{formatInTz(a.startAt, "EEE", timeZone)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-charcoal">{a.services.map((s) => s.serviceName).join(", ")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatInTz(a.startAt, "h:mm a", timeZone)} · with {a.staff.user.name} · <span className="font-mono text-xs">{a.reference}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge status={a.status} />
                <PaymentBadge status={a.paymentStatus} />
                {a.rescheduleRequestedAt && <Badge variant="info">Reschedule requested</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end">
              <span className="font-serif text-xl text-charcoal">{formatINR(a.total)}</span>
              <ChevronRight className="size-4 text-muted-rose transition group-hover:translate-x-0.5" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NoAppointments({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <EmptyState icon={<CalendarDays className="size-5" />} title={title} description={description} action={action} />;
}
