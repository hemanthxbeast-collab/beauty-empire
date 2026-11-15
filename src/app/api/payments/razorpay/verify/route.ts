import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertBookingAccess, assertSameOrigin, errorResponse } from "@/server/http";
import { markOrderFailed, verifyCheckoutPayment } from "@/server/services/payments";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { idSchema } from "@/lib/validations/booking";

const rzId = z.string().min(5).max(64).regex(/^[A-Za-z0-9_]+$/);

const successSchema = z.object({
  appointmentId: idSchema,
  token: z.string().max(64).optional(),
  razorpay_order_id: rzId,
  razorpay_payment_id: rzId,
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

const failureSchema = z.object({
  appointmentId: idSchema,
  token: z.string().max(64).optional(),
  failed: z.literal(true),
  razorpay_order_id: rzId,
  reason: z.string().max(300).optional(),
});

/** Called by the browser after Razorpay Checkout. The payment is only trusted after server-side signature + API verification. */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await enforceRateLimit("payment");
    const body = await req.json().catch(() => null);

    const failure = failureSchema.safeParse(body);
    if (failure.success) {
      await assertBookingAccess(failure.data.appointmentId, failure.data.token);
      await markOrderFailed(failure.data.razorpay_order_id, failure.data.reason ?? "Payment failed or was cancelled");
      return NextResponse.json({ ok: true, status: "FAILED" });
    }

    const parsed = successSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid payment response" }, { status: 400 });
    await assertBookingAccess(parsed.data.appointmentId, parsed.data.token);
    await verifyCheckoutPayment({
      appointmentId: parsed.data.appointmentId,
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });
    return NextResponse.json({ ok: true, status: "PAID" });
  } catch (err) {
    return errorResponse(err, "razorpay/verify");
  }
}
