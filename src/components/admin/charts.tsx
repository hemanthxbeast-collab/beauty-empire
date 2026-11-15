"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/lib/utils";

type Datum = { label: string; value: number };

// Single-series charts: brand magenta for the mark, text in ink tokens, recessive grid.
const MARK = "#C21870";
const GRID = "#efe4e9";
const INK_MUTED = "#8a7a82";

function ChartTooltip({ active, payload, label, money, unit }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; money?: boolean; unit?: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]!.value;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs shadow-soft">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold text-charcoal">
        {money ? formatINR(v) : v} {unit}
      </p>
    </div>
  );
}

const axis = { tick: { fill: INK_MUTED, fontSize: 11 }, axisLine: false, tickLine: false } as const;

export function ColumnChart({ data, money, unit, height = 240 }: { data: Datum[]; money?: boolean; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} allowDecimals={false} tickFormatter={(v: number) => (money ? (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`) : String(v))} />
        <Tooltip cursor={{ fill: "rgba(194,24,112,0.06)" }} content={<ChartTooltip money={money} unit={unit} />} />
        <Bar dataKey="value" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendChart({ data, unit, height = 240 }: { data: Datum[]; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MARK} stopOpacity={0.18} />
            <stop offset="100%" stopColor={MARK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...axis} interval={6} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip cursor={{ stroke: INK_MUTED, strokeDasharray: "3 3" }} content={<ChartTooltip unit={unit} />} />
        <Area type="monotone" dataKey="value" stroke={MARK} strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RankedBars({ data, unit }: { data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="py-10 text-center text-sm text-muted-foreground">No bookings in this period yet.</p>;
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${d.value} ${unit ?? ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-charcoal">{d.label}</span>
            <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{d.value}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-soft-grey">
            <div className="h-2 rounded-full bg-magenta transition-all group-hover:bg-magenta-deep" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
