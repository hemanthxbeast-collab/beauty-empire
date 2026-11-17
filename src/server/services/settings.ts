import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db";
import type { BusinessHours, DayHours } from "@/lib/booking/slots";
import { dateKeyInTz, dayOfWeekForDateKey, formatMinuteOfDay } from "@/lib/time";

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  "0": { open: 600, close: 1140, closed: false }, // Sun 10:00–19:00
  "1": { open: 600, close: 1200, closed: false }, // Mon 10:00–20:00
  "2": { open: 600, close: 1200, closed: false },
  "3": { open: 600, close: 1200, closed: false },
  "4": { open: 600, close: 1200, closed: false },
  "5": { open: 600, close: 1260, closed: false }, // Fri 10:00–21:00
  "6": { open: 540, close: 1260, closed: false }, // Sat 09:00–21:00
};

export function parseBusinessHours(value: unknown): BusinessHours {
  const result: BusinessHours = {};
  const obj = (value && typeof value === "object" ? value : {}) as Record<string, Partial<DayHours>>;
  for (let d = 0; d < 7; d++) {
    const day = obj[String(d)];
    const fallback = DEFAULT_BUSINESS_HOURS[String(d)]!;
    result[String(d)] = {
      open: typeof day?.open === "number" ? day.open : fallback.open,
      close: typeof day?.close === "number" ? day.close : fallback.close,
      closed: typeof day?.closed === "boolean" ? day.closed : fallback.closed,
    };
  }
  return result;
}

/** Salon settings singleton (row id = 1). Memoised per request. */
export const getSalonSettings = cache(async () => {
  const settings = await prisma.salonSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    throw new Error("Salon settings missing — run `npm run db:seed` to initialise the database.");
  }
  return { ...settings, businessHours: parseBusinessHours(settings.businessHours) };
});

export type SalonSettingsData = Awaited<ReturnType<typeof getSalonSettings>>;

export function fullAddress(s: Pick<SalonSettingsData, "addressLine1" | "addressLine2" | "city" | "state" | "postalCode">) {
  return [s.addressLine1, s.addressLine2, `${s.city}, ${s.state} ${s.postalCode}`].filter(Boolean).join(", ");
}

/** Today's opening hours in the salon's timezone, e.g. "Open today · 10:00 AM – 8:00 PM". */
export function todayHoursLabel(settings: Pick<SalonSettingsData, "businessHours" | "timezone">, now = new Date()) {
  const h = settings.businessHours[String(dayOfWeekForDateKey(dateKeyInTz(now, settings.timezone)))];
  if (!h || h.closed) return { open: false, label: "Closed today" };
  return { open: true, label: `${formatMinuteOfDay(h.open)} – ${formatMinuteOfDay(h.close)}` };
}

/** "@handle" from an Instagram profile URL, or null when not configured. */
export function instagramHandle(url: string | null | undefined) {
  if (!url) return null;
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg ? `@${seg}` : null;
  } catch {
    return null;
  }
}
