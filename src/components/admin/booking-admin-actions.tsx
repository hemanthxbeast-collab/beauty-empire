"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { Field, Skeleton } from "@/components/ui/primitives";
import { Calendar } from "@/components/booking/calendar";
import { ActionButton } from "@/components/dashboard/action-button";
import { adminRescheduleAction, updateBookingStatusAction } from "@/server/actions/admin-ops";
import { cn } from "@/lib/utils";

type Status = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REJECTED" | "NO_SHOW";

const LABELS: Record<Status, string> = {
  CONFIRMED: "Confirm booking",
  COMPLETED: "Mark completed",
  CANCELLED: "Cancel booking",
  REJECTED: "Reject booking",
  NO_SHOW: "Mark no-show",
};

/** Status buttons for the allowed transitions; reasons are requested for cancel / reject. */
export function StatusActions({ appointmentId, allowed }: { appointmentId: string; allowed: Status[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((status) =>
        status === "CANCELLED" || status === "REJECTED" ? (
          <ReasonDialog key={status} appointmentId={appointmentId} status={status} />
        ) : (
          <ActionButton
            key={status}
            action={updateBookingStatusAction}
            args={{ appointmentId, status }}
            variant={status === "CONFIRMED" || status === "COMPLETED" ? "default" : "outline"}
            confirm={status === "NO_SHOW" ? { title: "Mark as no-show?", description: "The customer will be recorded as not attending." } : undefined}
          >
            {LABELS[status]}
          </ActionButton>
        ),
      )}
    </div>
  );
}

function ReasonDialog({ appointmentId, status }: { appointmentId: string; status: "CANCELLED" | "REJECTED" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:border-red-400 hover:text-red-800">
          {LABELS[status]}
        </Button>
      </DialogTrigger>
      <DialogContent role="alertdialog">
        <DialogTitle>{LABELS[status]}?</DialogTitle>
        <DialogDescription>The customer will be notified by email. This cannot be undone.</DialogDescription>
        <Field label="Reason (shared with the customer)" htmlFor="adm-reason" className="mt-6">
          <Textarea id="adm-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Go back
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const res = await updateBookingStatusAction({ appointmentId, status, reason: reason || undefined });
              setPending(false);
              if (res.ok) {
                toast.success(res.message ?? "Updated");
                setOpen(false);
                router.refresh();
              } else toast.error(res.error);
            }}
          >
            {pending && <Loader2 className="animate-spin" />} {LABELS[status]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminRescheduleDialog({
  appointmentId,
  serviceIds,
  currentStaffId,
  staff,
  today,
  lastDate,
  label = "Reschedule / reassign",
}: {
  appointmentId: string;
  serviceIds: string[];
  currentStaffId: string;
  staff: Array<{ id: string; name: string }>;
  today: string;
  lastDate: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState(currentStaffId);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Array<{ minuteOfDay: number; label: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setMinute(null);
    setError(null);
    const qs = new URLSearchParams({ serviceIds: serviceIds.join(","), staffId, date, exclude: appointmentId });
    fetch(`/api/availability?${qs}`, { cache: "no-store" })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error);
        setSlots(b.slots);
      })
      .catch((e: Error) => {
        setSlots([]);
        setError(e.message || "Could not load availability");
      });
  }, [date, staffId, serviceIds, appointmentId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarClock /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogTitle>Reschedule appointment</DialogTitle>
        <DialogDescription>Only conflict-free times are shown. The customer is notified automatically.</DialogDescription>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Professional" htmlFor="rs-staff">
              <NativeSelect id="rs-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Calendar value={date} onChange={setDate} minDate={today} maxDate={lastDate} />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-charcoal">Available times</p>
            {!date && <p className="text-sm text-muted-foreground">Select a date.</p>}
            {date && !slots && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-full" />
                ))}
              </div>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
            {slots && slots.length === 0 && !error && <p className="text-sm text-muted-foreground">No conflict-free times for this professional on this date.</p>}
            {slots && slots.length > 0 && (
              <div role="radiogroup" aria-label="Available times" className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
                {slots.map((s) => (
                  <button
                    key={s.minuteOfDay}
                    type="button"
                    role="radio"
                    aria-checked={minute === s.minuteOfDay}
                    onClick={() => setMinute(s.minuteOfDay)}
                    className={cn("h-10 rounded-full border text-xs", minute === s.minuteOfDay ? "border-magenta bg-magenta text-white" : "border-border hover:border-magenta")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Close
          </Button>
          <Button
            disabled={!date || minute === null || pending}
            onClick={async () => {
              setPending(true);
              const res = await adminRescheduleAction({ appointmentId, date, minuteOfDay: minute, staffId });
              setPending(false);
              if (res.ok) {
                toast.success(res.message ?? "Rescheduled");
                setOpen(false);
                router.refresh();
              } else toast.error(res.error);
            }}
          >
            {pending && <Loader2 className="animate-spin" />} Save new time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
