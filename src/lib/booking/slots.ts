/**
 * Pure slot-generation logic (no I/O) so it can be unit tested in isolation.
 * All "minute" values are minutes from midnight in the salon timezone.
 */
import { zonedToUtc } from "@/lib/time";

export type DayHours = { open: number; close: number; closed: boolean };
export type BusinessHours = Record<string, DayHours>; // key "0".."6"

export type StaffDayInput = {
  id: string;
  /** Weekly availability row for this weekday, or null when none configured. */
  availability: { startMinute: number; endMinute: number; isAvailable: boolean } | null;
  onLeave: boolean;
  busy: Array<{ startAt: Date; endAt: Date }>;
};

export type SlotInput = {
  dateKey: string;
  timeZone: string;
  dayHours: DayHours | undefined;
  durationMinutes: number;
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minLeadTimeMinutes: number;
  now: Date;
  staff: StaffDayInput[];
};

export type Slot = {
  minuteOfDay: number;
  startAt: Date;
  endAt: Date;
  staffIds: string[];
};

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date, bufferMinutes = 0) {
  const buffer = bufferMinutes * 60_000;
  return aStart.getTime() < bEnd.getTime() + buffer && bStart.getTime() - buffer < aEnd.getTime();
}

/** Working window for one staff member on the day, intersected with salon hours. */
export function staffWindow(dayHours: DayHours | undefined, staff: StaffDayInput): [number, number] | null {
  if (!dayHours || dayHours.closed || staff.onLeave) return null;
  if (!staff.availability || !staff.availability.isAvailable) return null;
  const start = Math.max(dayHours.open, staff.availability.startMinute);
  const end = Math.min(dayHours.close, staff.availability.endMinute);
  return end > start ? [start, end] : null;
}

export function computeSlots(input: SlotInput): Slot[] {
  const { durationMinutes, slotIntervalMinutes } = input;
  if (durationMinutes <= 0 || slotIntervalMinutes <= 0) return [];
  const earliest = input.now.getTime() + input.minLeadTimeMinutes * 60_000;
  const bySlot = new Map<number, Slot>();

  for (const staff of input.staff) {
    const window = staffWindow(input.dayHours, staff);
    if (!window) continue;
    const [winStart, winEnd] = window;
    const first = Math.ceil(winStart / slotIntervalMinutes) * slotIntervalMinutes;
    for (let t = first; t + durationMinutes <= winEnd; t += slotIntervalMinutes) {
      const startAt = zonedToUtc(input.dateKey, t, input.timeZone);
      if (startAt.getTime() < earliest) continue;
      const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
      const clash = staff.busy.some((b) => overlaps(startAt, endAt, b.startAt, b.endAt, input.bufferMinutes));
      if (clash) continue;
      const existing = bySlot.get(t);
      if (existing) existing.staffIds.push(staff.id);
      else bySlot.set(t, { minuteOfDay: t, startAt, endAt, staffIds: [staff.id] });
    }
  }
  return [...bySlot.values()].sort((a, b) => a.minuteOfDay - b.minuteOfDay);
}

/** Whether a customer may cancel under the salon policy. */
export function canCustomerCancel(params: {
  status: string;
  startAt: Date;
  now: Date;
  cancellationWindowHours: number;
}) {
  if (params.status !== "PENDING" && params.status !== "CONFIRMED") {
    return { allowed: false as const, reason: "This appointment can no longer be cancelled." };
  }
  const hoursUntil = (params.startAt.getTime() - params.now.getTime()) / 3_600_000;
  if (hoursUntil < params.cancellationWindowHours) {
    return {
      allowed: false as const,
      reason: `Appointments can only be cancelled online at least ${params.cancellationWindowHours} hours in advance. Please contact the salon.`,
    };
  }
  return { allowed: true as const, reason: null };
}

/** Booking reference like "BE-7K3QX9M2" — unambiguous characters only. */
export function generateBookingReference(random: (n: number) => Uint8Array) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = random(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `BE-${out}`;
}
