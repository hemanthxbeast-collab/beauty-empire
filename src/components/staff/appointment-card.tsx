import { Phone, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { ActionButton } from "@/components/dashboard/action-button";
import { StaffNotes } from "./staff-notes";
import { updateBookingStatusAction } from "@/server/actions/admin-ops";
import { formatInTz, hasStarted } from "@/lib/time";
import { formatDuration } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

export const staffAppointmentSelect = {
  id: true,
  reference: true,
  startAt: true,
  endAt: true,
  status: true,
  paymentStatus: true,
  customerName: true,
  customerPhone: true,
  notes: true,
  specialRequirements: true,
  staffNotes: true,
  customer: { select: { skinType: true, hairType: true, preferences: true } },
  services: { select: { serviceName: true, durationMinutes: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.AppointmentSelect;

export type StaffAppointment = Prisma.AppointmentGetPayload<{ select: typeof staffAppointmentSelect }>;

/** Shows only what a professional needs for the service — no email or payment amounts. */
export function StaffAppointmentCard({ a, timeZone }: { a: StaffAppointment; timeZone: string }) {
  const started = hasStarted(a.startAt);
  const duration = a.services.reduce((s, x) => s + x.durationMinutes, 0);
  return (
    <article className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="w-24 shrink-0 rounded-xl bg-blush/70 px-3 py-2.5 text-center text-magenta-deep">
          <p className="font-serif text-2xl leading-none">{formatInTz(a.startAt, "h:mm", timeZone)}</p>
          <p className="text-[0.65rem] font-semibold uppercase">{formatInTz(a.startAt, "a · d MMM", timeZone)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-charcoal">{a.customerName}</p>
            <StatusBadge status={a.status} />
            <PaymentBadge status={a.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {a.services.map((s) => s.serviceName).join(" + ")} · {formatDuration(duration)} · until {formatInTz(a.endAt, "h:mm a", timeZone)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm">
            <Phone className="size-3.5 text-magenta" aria-hidden />
            <a href={`tel:${a.customerPhone}`} className="hover:text-magenta">
              {a.customerPhone}
            </a>
            <span className="font-mono text-xs text-muted-rose">· {a.reference}</span>
          </p>
          {(a.notes || a.specialRequirements || a.customer?.skinType || a.customer?.hairType || a.customer?.preferences) && (
            <div className="mt-3 space-y-1 rounded-xl bg-ivory p-3 text-xs">
              {a.specialRequirements && (
                <p>
                  <Badge variant="warning" className="mr-1">
                    Special
                  </Badge>
                  {a.specialRequirements}
                </p>
              )}
              {a.notes && (
                <p className="flex gap-1.5">
                  <StickyNote className="size-3.5 shrink-0 text-muted-rose" /> {a.notes}
                </p>
              )}
              {(a.customer?.skinType || a.customer?.hairType) && (
                <p className="text-muted-foreground">
                  {a.customer?.skinType && `Skin: ${a.customer.skinType}`} {a.customer?.hairType && `· Hair: ${a.customer.hairType}`}
                </p>
              )}
              {a.customer?.preferences && <p className="text-muted-foreground">Preferences: {a.customer.preferences}</p>}
            </div>
          )}
          <StaffNotes appointmentId={a.id} initial={a.staffNotes ?? ""} />
        </div>
        {a.status === "CONFIRMED" && started && (
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <ActionButton action={updateBookingStatusAction} args={{ appointmentId: a.id, status: "COMPLETED" }}>
              Mark completed
            </ActionButton>
            <ActionButton action={updateBookingStatusAction} args={{ appointmentId: a.id, status: "NO_SHOW" }} variant="ghost" confirm={{ title: "Mark as no-show?", confirmLabel: "Mark no-show" }}>
              No-show
            </ActionButton>
          </div>
        )}
        {a.status === "PENDING" && <p className="shrink-0 text-xs text-muted-foreground">Awaiting salon confirmation</p>}
      </div>
    </article>
  );
}
