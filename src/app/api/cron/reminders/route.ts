import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { releaseExpiredPaymentHolds } from "@/server/services/availability";
import { sendReminder } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

function authorised(req: NextRequest) {
  const secret = env.cronSecret;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Scheduled job (Vercel Cron → GET with "Authorization: Bearer $CRON_SECRET").
 * - Sends reminder emails for confirmed appointments starting in the next 24 hours.
 * - Releases slots held by abandoned online payments.
 */
export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const released = await releaseExpiredPaymentHolds();
  const now = new Date();
  const due = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", reminderSentAt: null, startAt: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) } },
    select: { id: true },
    take: 200,
  });

  let sent = 0;
  for (const a of due) {
    // Claim first so concurrent runs never double-send.
    const claimed = await prisma.appointment.updateMany({ where: { id: a.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (claimed.count === 0) continue;
    const ok = await sendReminder(a.id).catch(() => false);
    if (ok) sent++;
    else await prisma.appointment.update({ where: { id: a.id }, data: { reminderSentAt: null } });
  }
  return NextResponse.json({ ok: true, remindersSent: sent, candidates: due.length, releasedHolds: released });
}
