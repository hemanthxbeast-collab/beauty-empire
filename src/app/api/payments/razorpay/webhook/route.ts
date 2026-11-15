import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { markOrderFailed, markOrderPaid, verifyWebhookSignature } from "@/server/services/payments";

export const dynamic = "force-dynamic";

type RazorpayEvent = {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; status: string; error_description?: string } } };
};

/**
 * Razorpay webhook (configure in Dashboard → Webhooks with RAZORPAY_WEBHOOK_SECRET).
 * Authenticated by HMAC signature over the raw body; idempotent via the x-razorpay-event-id header.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: RazorpayEvent;
  try {
    event = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventId = req.headers.get("x-razorpay-event-id");
  if (eventId && (await prisma.webhookEvent.findUnique({ where: { id: eventId }, select: { id: true } }))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const payment = event.payload?.payment?.entity;
  try {
    if (payment?.order_id) {
      if (event.event === "payment.captured" || event.event === "order.paid") {
        // markOrderPaid is idempotent, so concurrent duplicate deliveries are harmless.
        await markOrderPaid({ orderId: payment.order_id, paymentId: payment.id, amountPaise: payment.amount, source: "webhook" });
      } else if (event.event === "payment.failed") {
        await markOrderFailed(payment.order_id, payment.error_description ?? "Payment failed");
      }
    }
  } catch (err) {
    const known = err instanceof Error && err.name === "AppError";
    console.error("[razorpay/webhook]", err);
    // Unknown orders / amount mismatches are acknowledged (no retry); unexpected errors return 500 so Razorpay retries.
    if (!known) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
  // Record only after successful processing so failed attempts can be retried.
  if (eventId) await prisma.webhookEvent.createMany({ data: [{ id: eventId, provider: "razorpay", type: event.event }], skipDuplicates: true });
  return NextResponse.json({ ok: true });
}
