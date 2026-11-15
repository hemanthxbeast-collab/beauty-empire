"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/dialog";
import { addLeaveAction, deleteLeaveAction, saveAvailabilityAction } from "@/server/actions/admin-ops";
import { DAY_NAMES } from "@/lib/constants";

type Day = { dayOfWeek: number; isAvailable: boolean; start: string; end: string };

/** Weekly working hours editor. Used by admins (any staff) and staff (themselves — enforced server-side). */
export function AvailabilityEditor({ staffId, initial }: { staffId?: string; initial: Day[] }) {
  const router = useRouter();
  const [days, setDays] = useState<Day[]>(initial);
  const [pending, setPending] = useState(false);
  const update = (i: number, patch: Partial<Day>) => setDays((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
        {order.map((dow) => {
          const i = days.findIndex((d) => d.dayOfWeek === dow);
          const d = days[i]!;
          return (
            <li key={dow} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <span className="w-28 text-sm font-medium text-charcoal">{DAY_NAMES[dow]}</span>
              <Switch checked={d.isAvailable} onCheckedChange={(v) => update(i, { isAvailable: v })} aria-label={`Working on ${DAY_NAMES[dow]}`} />
              {d.isAvailable ? (
                <div className="flex items-center gap-2 text-sm">
                  <Input type="time" step={900} value={d.start} onChange={(e) => update(i, { start: e.target.value })} className="h-10 w-32" aria-label={`${DAY_NAMES[dow]} start`} />
                  <span className="text-muted-foreground">to</span>
                  <Input type="time" step={900} value={d.end} onChange={(e) => update(i, { end: e.target.value })} className="h-10 w-32" aria-label={`${DAY_NAMES[dow]} end`} />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Day off</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Bookable times are also limited by salon business hours.</p>
      <Button
        className="mt-4"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const res = await saveAvailabilityAction({ staffId, days });
          setPending(false);
          if (res.ok) {
            toast.success(res.message ?? "Saved");
            router.refresh();
          } else toast.error(res.error);
        }}
      >
        {pending && <Loader2 className="animate-spin" />} Save working hours
      </Button>
    </div>
  );
}

export function LeaveManager({ staffId, leaves }: { staffId?: string; leaves: Array<{ id: string; startDate: string; endDate: string; reason: string | null }> }) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-5">
      <form
        className="grid gap-3 rounded-2xl border border-border bg-white p-5 sm:grid-cols-[1fr_1fr_1.5fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await addLeaveAction({ staffId, startDate: start, endDate: end || start, reason: reason || undefined });
          setPending(false);
          if (res.ok) {
            toast.success(res.message ?? "Saved");
            setStart("");
            setEnd("");
            setReason("");
            router.refresh();
          } else toast.error(res.error);
        }}
      >
        <Field label="From" htmlFor="lv-start">
          <Input id="lv-start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} className="h-10" />
        </Field>
        <Field label="To" htmlFor="lv-end">
          <Input id="lv-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="h-10" />
        </Field>
        <Field label="Reason (optional)" htmlFor="lv-reason">
          <Input id="lv-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="h-10" />
        </Field>
        <Button type="submit" disabled={!start || pending} className="h-10">
          {pending && <Loader2 className="animate-spin" />} Add leave
        </Button>
      </form>
      {leaves.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming leave scheduled.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {leaves.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span>
                <strong className="font-medium">{l.startDate === l.endDate ? l.startDate : `${l.startDate} → ${l.endDate}`}</strong>
                {l.reason && <span className="text-muted-foreground"> · {l.reason}</span>}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove leave"
                onClick={async () => {
                  const res = await deleteLeaveAction(l.id);
                  if (res.ok) {
                    toast.success(res.message ?? "Removed");
                    router.refresh();
                  } else toast.error(res.error);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
