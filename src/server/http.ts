import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { AppError, HTTP_STATUS } from "@/server/errors";
import { env } from "@/server/env";
import { getCurrentUser } from "@/server/session";
import { prisma } from "@/server/db";
import { verifyBookingAccessToken } from "@/server/services/tokens";

/** CSRF defence for cookie-authenticated JSON endpoints: require a same-origin Origin header. */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = new Set([new URL(env.appUrl).origin, req.nextUrl.origin]);
  if (!origin || !allowed.has(origin)) throw new AppError("Invalid request origin.", "FORBIDDEN");
}

export function errorResponse(err: unknown, scope: string) {
  if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: HTTP_STATUS[err.code] });
  console.error(`[${scope}]`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/**
 * A booking may be acted on by: the holder of its signed access token, the customer who owns it,
 * or an administrator. Everyone else gets "not found".
 */
export async function assertBookingAccess(appointmentId: string, token?: string | null) {
  if (verifyBookingAccessToken(appointmentId, token)) return;
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return;
  if (user?.role === "CUSTOMER" && user.customerProfileId) {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { customerId: true } });
    if (appt && appt.customerId === user.customerProfileId) return;
  }
  throw new AppError("Booking not found.", "NOT_FOUND");
}
