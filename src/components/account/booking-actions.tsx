"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Skeleton } from "@/components/ui/primitives";
import { Calendar } from "@/components/booking/calendar";
import { cancelMyBookingAction, requestRescheduleAction, submitReviewAction } from "@/server/actions/booking";
import { cn } from "@/lib/utils";

export function CancelBookingButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-200 text-red-700 hover:border-red-400 hover:text-red-800">
          <XCircle /> Cancel appointment
        </Button>
      </DialogTrigger>
      <DialogContent role="alertdialog">
        <DialogTitle>Cancel this appointment?</DialogTitle>
        <DialogDescription>This cannot be undone. The time slot will be released for other guests.</DialogDescription>
        <Field label="Reason (optional)" htmlFor="cancel-reason" className="mt-6">
          <Textarea id="cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep appointment
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const res = await cancelMyBookingAction({ appointmentId, reason: reason || undefined });
              setPending(false);
              if (res.ok) {
                toast.success(res.message ?? "Cancelled");
                setOpen(false);
                router.refresh();
              } else toast.error(res.error);
            }}
          >
            {pending && <Loader2 className="animate-spin" />} Yes, cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Slot = { minuteOfDay: number; label: string };

export function RescheduleButton({
  appointmentId,
  serviceIds,
  staffId,
  today,
  lastDate,
  closedWeekdays,
}: {
  appointmentId: string;
  serviceIds: string[];
  staffId: string;
  today: string;
  lastDate: string;
  closedWeekdays: number[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!date) return;
    setSlots(null);
    setMinute(null);
    const qs = new URLSearchParams({ serviceIds: serviceIds.join(","), staffId, date });
    fetch(`/api/availability?${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setSlots(Array.isArray(b.slots) ? b.slots : []))
      .catch(() => setSlots([]));
  }, [date, serviceIds, staffId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarClock /> Request reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Request a new time</DialogTitle>
        <DialogDescription>Choose a preferred new slot with the same professional. The salon will confirm the change.</DialogDescription>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Calendar value={date} onChange={setDate} minDate={today} maxDate={lastDate} isDisabled={(_, wd) => closedWeekdays.includes(wd)} />
          <div>
            {!date && <p className="text-sm text-muted-foreground">Select a date to see available times.</p>}
            {date && !slots && (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-full" />
                ))}
              </div>
            )}
            {slots && slots.length === 0 && <p className="text-sm text-muted-foreground">No times available that day.</p>}
            {slots && slots.length > 0 && (
              <div role="radiogroup" aria-label="Available times" className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
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
            <Field label="Note (optional)" htmlFor="rs-note" className="mt-5">
              <Input id="rs-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
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
              const res = await requestRescheduleAction({ appointmentId, date, minuteOfDay: minute, note: note || undefined });
              setPending(false);
              if (res.ok) {
                toast.success(res.message ?? "Request sent");
                setOpen(false);
                router.refresh();
              } else toast.error(res.error);
            }}
          >
            {pending && <Loader2 className="animate-spin" />} Send request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, setPending] = useState(false);

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await submitReviewAction({ appointmentId, rating, title: title || undefined, comment });
        setPending(false);
        if (res.ok) {
          toast.success(res.message ?? "Thank you!");
          router.refresh();
        } else {
          setErrors(Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, v]) => [k, v?.[0]])));
          toast.error(res.error);
        }
      }}
    >
      <fieldset>
        <legend className="text-sm font-medium text-charcoal">Your rating</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === i}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="rounded p-0.5"
            >
              <Star className={cn("size-7 transition", i <= (hover || rating) ? "fill-magenta text-magenta" : "text-rose")} />
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-1 text-[0.8rem] text-destructive">{errors.rating}</p>}
      </fieldset>
      <Field label="Title (optional)" htmlFor="rv-title">
        <Input id="rv-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Your review" htmlFor="rv-comment" error={errors.comment} required>
        <Textarea id="rv-comment" rows={4} maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} aria-invalid={!!errors.comment || undefined} />
      </Field>
      <Button type="submit" disabled={pending || rating === 0}>
        {pending && <Loader2 className="animate-spin" />} Submit review
      </Button>
    </form>
  );
}
