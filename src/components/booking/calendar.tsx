"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function keyOf(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

/** Accessible month calendar operating on "YYYY-MM-DD" keys (salon-local dates). */
export function Calendar({
  value,
  onChange,
  minDate,
  maxDate,
  isDisabled,
}: {
  value: string | null;
  onChange: (dateKey: string) => void;
  minDate: string;
  maxDate: string;
  isDisabled?: (dateKey: string, weekday: number) => boolean;
}) {
  const [minY, minM] = minDate.split("-").map(Number) as [number, number];
  const [maxY, maxM] = maxDate.split("-").map(Number) as [number, number];
  const initial = value ? (value.split("-").map(Number) as [number, number, number]) : [minY, minM, 1];
  const [view, setView] = useState({ y: initial[0], m: initial[1] - 1 });

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const out: Array<{ key: string; day: number; weekday: number } | null> = Array(first).fill(null);
    for (let d = 1; d <= days; d++) out.push({ key: keyOf(view.y, view.m, d), day: d, weekday: (first + d - 1) % 7 });
    return out;
  }, [view]);

  const canPrev = view.y > minY || (view.y === minY && view.m > minM - 1);
  const canNext = view.y < maxY || (view.y === maxY && view.m < maxM - 1);
  const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(view.y, view.m, 1)));
  const shift = (delta: number) => setView((v) => ({ y: v.y + Math.floor((v.m + delta) / 12), m: (((v.m + delta) % 12) + 12) % 12 }));

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} className="rounded-full p-2 hover:bg-blush disabled:opacity-30" aria-label="Previous month">
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-serif text-xl text-charcoal" aria-live="polite">
          {label}
        </p>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} className="rounded-full p-2 hover:bg-blush disabled:opacity-30" aria-label="Next month">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div role="grid" aria-label={label} className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} role="columnheader" className="pb-2 text-[0.65rem] font-semibold tracking-wider text-muted-rose uppercase">
            {w}
          </div>
        ))}
        {cells.map((c, i) =>
          c ? (
            (() => {
              const disabled = c.key < minDate || c.key > maxDate || Boolean(isDisabled?.(c.key, c.weekday));
              const selected = value === c.key;
              const today = c.key === minDate;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="gridcell"
                  aria-selected={selected}
                  aria-label={new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${c.key}T00:00:00Z`)) + (disabled ? " (unavailable)" : "")}
                  disabled={disabled}
                  onClick={() => onChange(c.key)}
                  className={cn(
                    "relative mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-full text-sm transition",
                    disabled ? "cursor-not-allowed text-charcoal/25 line-through decoration-charcoal/20" : "text-charcoal hover:bg-blush",
                    selected && "bg-magenta text-white hover:bg-magenta-deep",
                    today && !selected && "ring-1 ring-magenta/40",
                  )}
                >
                  {c.day}
                </button>
              );
            })()
          ) : (
            <div key={`e${i}`} aria-hidden />
          ),
        )}
      </div>
    </div>
  );
}
