import { describe, expect, it } from "vitest";
import { canCustomerCancel, computeSlots, generateBookingReference, overlaps, staffWindow, type SlotInput } from "@/lib/booking/slots";
import { zonedToUtc } from "@/lib/time";
import { randomBytes } from "node:crypto";

const TZ = "Asia/Kolkata";
const DATE = "2030-03-12"; // a Tuesday

function base(overrides: Partial<SlotInput> = {}): SlotInput {
  return {
    dateKey: DATE,
    timeZone: TZ,
    dayHours: { open: 600, close: 1200, closed: false }, // 10:00–20:00
    durationMinutes: 60,
    slotIntervalMinutes: 30,
    bufferMinutes: 0,
    minLeadTimeMinutes: 0,
    now: new Date("2030-01-01T00:00:00Z"),
    staff: [{ id: "s1", availability: { startMinute: 600, endMinute: 1200, isAvailable: true }, onLeave: false, busy: [] }],
    ...overrides,
  };
}

describe("computeSlots", () => {
  it("generates slots within salon & staff hours, ending before close", () => {
    const slots = computeSlots(base());
    expect(slots[0]!.minuteOfDay).toBe(600);
    expect(slots.at(-1)!.minuteOfDay).toBe(1140); // 19:00 + 60min = 20:00
    expect(slots).toHaveLength(19);
  });

  it("converts wall-clock time in IST to the correct UTC instant", () => {
    const slots = computeSlots(base());
    expect(slots[0]!.startAt.toISOString()).toBe("2030-03-12T04:30:00.000Z"); // 10:00 IST = 04:30 UTC
  });

  it("intersects salon hours with the staff member's working hours", () => {
    const slots = computeSlots(base({ staff: [{ id: "s1", availability: { startMinute: 720, endMinute: 900, isAvailable: true }, onLeave: false, busy: [] }] }));
    expect(slots.map((s) => s.minuteOfDay)).toEqual([720, 750, 780, 810, 840]);
  });

  it("returns nothing on closed days, days off and leave", () => {
    expect(computeSlots(base({ dayHours: { open: 600, close: 1200, closed: true } }))).toEqual([]);
    expect(computeSlots(base({ staff: [{ id: "s1", availability: { startMinute: 600, endMinute: 1200, isAvailable: false }, onLeave: false, busy: [] }] }))).toEqual([]);
    expect(computeSlots(base({ staff: [{ id: "s1", availability: { startMinute: 600, endMinute: 1200, isAvailable: true }, onLeave: true, busy: [] }] }))).toEqual([]);
    expect(computeSlots(base({ staff: [{ id: "s1", availability: null, onLeave: false, busy: [] }] }))).toEqual([]);
  });

  it("excludes slots that overlap existing bookings (no double booking)", () => {
    const busy = [{ startAt: zonedToUtc(DATE, 720, TZ), endAt: zonedToUtc(DATE, 780, TZ) }]; // 12:00–13:00
    const minutes = computeSlots(base({ staff: [{ id: "s1", availability: { startMinute: 600, endMinute: 1200, isAvailable: true }, onLeave: false, busy }] })).map((s) => s.minuteOfDay);
    expect(minutes).not.toContain(690); // 11:30–12:30 overlaps
    expect(minutes).not.toContain(720);
    expect(minutes).not.toContain(750);
    expect(minutes).toContain(660); // 11:00–12:00 touches but does not overlap
    expect(minutes).toContain(780); // 13:00 starts exactly when the booking ends
  });

  it("applies the buffer between appointments", () => {
    const busy = [{ startAt: zonedToUtc(DATE, 720, TZ), endAt: zonedToUtc(DATE, 780, TZ) }];
    const minutes = computeSlots(base({ bufferMinutes: 15, staff: [{ id: "s1", availability: { startMinute: 600, endMinute: 1200, isAvailable: true }, onLeave: false, busy }] })).map((s) => s.minuteOfDay);
    expect(minutes).not.toContain(660);
    expect(minutes).not.toContain(780);
    expect(minutes).toContain(810);
  });

  it("respects the minimum lead time", () => {
    const now = zonedToUtc(DATE, 700, TZ); // 11:40 IST
    const minutes = computeSlots(base({ now, minLeadTimeMinutes: 60 })).map((s) => s.minuteOfDay);
    expect(minutes[0]).toBe(780); // earliest >= 12:40 → 13:00
  });

  it("aggregates staff per slot for 'no preference'", () => {
    const slots = computeSlots(
      base({
        staff: [
          { id: "a", availability: { startMinute: 600, endMinute: 720, isAvailable: true }, onLeave: false, busy: [] },
          { id: "b", availability: { startMinute: 660, endMinute: 780, isAvailable: true }, onLeave: false, busy: [] },
        ],
      }),
    );
    expect(slots.find((s) => s.minuteOfDay === 660)!.staffIds.sort()).toEqual(["a", "b"]);
    expect(slots.find((s) => s.minuteOfDay === 600)!.staffIds).toEqual(["a"]);
    expect(slots.find((s) => s.minuteOfDay === 720)!.staffIds).toEqual(["b"]);
  });
});

describe("helpers", () => {
  it("overlaps() treats touching intervals as non-overlapping", () => {
    const a = new Date("2030-01-01T10:00:00Z");
    const b = new Date("2030-01-01T11:00:00Z");
    const c = new Date("2030-01-01T12:00:00Z");
    expect(overlaps(a, b, b, c)).toBe(false);
    expect(overlaps(a, c, b, c)).toBe(true);
  });

  it("staffWindow() intersects hours", () => {
    expect(staffWindow({ open: 600, close: 1200, closed: false }, { id: "x", availability: { startMinute: 540, endMinute: 1080, isAvailable: true }, onLeave: false, busy: [] })).toEqual([600, 1080]);
  });

  it("generates unambiguous booking references", () => {
    for (let i = 0; i < 50; i++) expect(generateBookingReference((n) => randomBytes(n))).toMatch(/^BE-[A-HJ-NP-Z2-9]{8}$/);
  });
});

describe("cancellation policy", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  it("allows cancellation outside the window", () => {
    expect(canCustomerCancel({ status: "CONFIRMED", startAt: new Date("2030-01-02T01:00:00Z"), now, cancellationWindowHours: 24 }).allowed).toBe(true);
  });
  it("blocks cancellation inside the window", () => {
    const r = canCustomerCancel({ status: "CONFIRMED", startAt: new Date("2030-01-01T23:00:00Z"), now, cancellationWindowHours: 24 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/24 hours/);
  });
  it("blocks cancellation of completed or cancelled appointments", () => {
    expect(canCustomerCancel({ status: "COMPLETED", startAt: new Date("2031-01-01T00:00:00Z"), now, cancellationWindowHours: 24 }).allowed).toBe(false);
    expect(canCustomerCancel({ status: "CANCELLED", startAt: new Date("2031-01-01T00:00:00Z"), now, cancellationWindowHours: 24 }).allowed).toBe(false);
  });
});
