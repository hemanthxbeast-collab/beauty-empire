import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(expected: string, given: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Razorpay Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret), hex. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqual(createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

/** Razorpay webhook signature: HMAC_SHA256(raw request body, webhook_secret), hex. */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  if (!secret || !signature) return false;
  return safeEqual(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
