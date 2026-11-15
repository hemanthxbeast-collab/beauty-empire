import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertBookingAccess, assertSameOrigin, errorResponse } from "@/server/http";
import { createRazorpayOrder } from "@/server/services/payments";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { getCurrentUser } from "@/server/session";
import { idSchema } from "@/lib/validations/booking";

const bodySchema = z.object({ appointmentId: idSchema, token: z.string().max(64).optional() });

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await enforceRateLimit("payment");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    await assertBookingAccess(parsed.data.appointmentId, parsed.data.token);
    const user = await getCurrentUser();
    const order = await createRazorpayOrder(parsed.data.appointmentId, user?.id ?? null);
    return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err, "razorpay/order");
  }
}
