"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  ["Sun", "Sunday"],
  ["Mon", "Monday"],
  ["Tue", "Tuesday"],
  ["Wed", "Wednesday"],
  ["Thu", "Thursday"],
  ["Fri", "Friday"],
  ["Sat", "Saturday"],
] as const;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function keyOf(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
const longDate = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/**
 * Month calendar on "YYYY-MM-DD" keys (salon-local dates). Semantic table + real buttons:
 * each day is a button with its full date as the accessible name and aria-pressed for the selection.
 */
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

  const weeks = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const cells: Array<{ key: string; day: number; weekday: number } | null> = Array(first).fill(null);
    for (let d = 1; d <= days; d++) cells.push({ key: keyOf(view.y, view.m, d), day: d, weekday: (first + d - 1) % 7 });
    while (cells.length % 7) cells.push(null);
    const rows: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [view]);

  const canPrev = view.y > minY || (view.y === minY && view.m > minM - 1);
  const canNext = view.y < maxY || (view.y === maxY && view.m < maxM - 1);
  const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(view.y, view.m, 1)));
  const shift = (delta: number) => setView((v) => ({ y: v.y + Math.floor((v.m + delta) / 12), m: (((v.m + delta) % 12) + 12) % 12 }));

  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          className="flex size-11 items-center justify-center rounded-full hover:bg-blush disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="font-serif text-xl text-charcoal" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          className="flex size-11 items-center justify-center rounded-full hover:bg-blush disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <table className="w-full table-fixed border-collapse text-center">
        <caption className="sr-only">Choose a date in {label}. Unavailable dates are disabled.</caption>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, full]) => (
              <th key={short} scope="col" abbr={full} className="pb-2 text-[0.65rem] font-semibold tracking-wider text-muted-rose uppercase">
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((row, r) => (
            <tr key={r}>
              {row.map((c, i) =>
                c ? (
                  <td key={c.key} className="p-0.5">
                    {(() => {
                      const disabled = c.key < minDate || c.key > maxDate || Boolean(isDisabled?.(c.key, c.weekday));
                      const selected = value === c.key;
                      const today = c.key === minDate;
                      return (
                        <button
                          type="button"
                          data-day={c.key}
                          aria-pressed={selected}
                          aria-label={longDate.format(new Date(`${c.key}T00:00:00Z`)) + (today ? ", today" : "") + (disabled ? ", unavailable" : "")}
                          disabled={disabled}
                          onClick={() => onChange(c.key)}
                          className={cn(
                            "mx-auto flex aspect-square w-full max-w-12 min-w-9 items-center justify-center rounded-full text-sm transition",
                            disabled ? "cursor-not-allowed text-charcoal/30 line-through decoration-charcoal/25" : "text-charcoal hover:bg-blush",
                            selected && "bg-magenta text-white hover:bg-magenta-deep",
                            today && !selected && "ring-1 ring-magenta/50",
                          )}
                        >
                          {c.day}
                        </button>
                      );
                    })()}
                  </td>
                ) : (
                  <td key={`e${r}-${i}`} aria-hidden />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
