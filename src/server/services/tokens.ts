import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}

/**
 * Capability token that lets a guest (or a signed-out customer) view and pay for one specific
 * booking via its confirmation link, without exposing bookings to reference-guessing.
 */
export function bookingAccessToken(appointmentId: string) {
  return createHmac("sha256", secret()).update(`booking-access:${appointmentId}`).digest("base64url").slice(0, 32);
}

export function verifyBookingAccessToken(appointmentId: string, token: string | null | undefined) {
  if (!token || token.length !== 32) return false;
  const expected = Buffer.from(bookingAccessToken(appointmentId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
