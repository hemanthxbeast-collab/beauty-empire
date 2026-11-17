import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { getCurrentUser } from "@/server/session";
import { fullAddress, getSalonSettings } from "@/server/services/settings";
import { manageUrl } from "@/server/services/notifications";
import { verifyBookingAccessToken } from "@/server/services/tokens";

export const dynamic = "force-dynamic";

/** RFC 5545 text escaping. */
function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function utc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * GET /api/bookings/BE-XXXXXXXX/calendar?t=<token> — an .ics file for the appointment.
 * Same access rule as the confirmation page: signed link, owning customer, or admin.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!/^BE-[A-Z0-9]{8}$/.test(reference)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const appt = await prisma.appointment.findUnique({
    where: { reference },
    select: { id: true, reference: true, customerId: true, startAt: true, endAt: true, status: true, updatedAt: true, services: { select: { serviceName: true }, orderBy: { sortOrder: "asc" } }, staff: { select: { user: { select: { name: true } } } } },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const token = req.nextUrl.searchParams.get("t");
  const user = await getCurrentUser();
  const allowed =
    verifyBookingAccessToken(appt.id, token) || (user?.role === "CUSTOMER" && appt.customerId !== null && user.customerProfileId === appt.customerId) || user?.role === "ADMIN";
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSalonSettings();
  const cancelled = appt.status === "CANCELLED" || appt.status === "REJECTED";
  const services = appt.services.map((s) => s.serviceName).join(", ");
  const host = new URL(env.appUrl).hostname;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Beauty Empire//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${appt.id}@${host}`,
    `DTSTAMP:${utc(new Date())}`,
    `LAST-MODIFIED:${utc(appt.updatedAt)}`,
    `DTSTART:${utc(appt.startAt)}`,
    `DTEND:${utc(appt.endAt)}`,
    `SUMMARY:${esc(`${settings.salonName}: ${services}`)}`,
    `LOCATION:${esc(fullAddress(settings))}`,
    `DESCRIPTION:${esc(`Booking ${appt.reference} with ${appt.staff.user.name}.\nManage: ${manageUrl(appt)}\nPhone: ${settings.phone}`)}`,
    `STATUS:${cancelled ? "CANCELLED" : appt.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${settings.salonName} appointment in 2 hours`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="beauty-empire-${appt.reference}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
