import { NextResponse, type NextRequest } from "next/server";
import { AppError, HTTP_STATUS } from "@/server/errors";
import { computeAvailability } from "@/server/services/availability";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { availabilityQuerySchema } from "@/lib/validations/booking";
import { getCurrentUser } from "@/server/session";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** GET /api/availability?serviceIds=a,b&staffId=any&date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = availabilityQuerySchema.safeParse({
    serviceIds: (sp.get("serviceIds") ?? "").split(",").filter(Boolean),
    staffId: sp.get("staffId") ?? "any",
    date: sp.get("date") ?? "",
    excludeAppointmentId: sp.get("exclude") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await enforceRateLimit("availability");
    // Ignoring an existing booking (to reschedule it) is allowed for an admin, or for the customer who owns it.
    let excludeAppointmentId: string | undefined;
    let isAdmin = false;
    if (parsed.data.excludeAppointmentId) {
      const user = await getCurrentUser();
      isAdmin = user?.role === "ADMIN";
      if (isAdmin) excludeAppointmentId = parsed.data.excludeAppointmentId;
      else if (user?.role === "CUSTOMER" && user.customerProfileId) {
        const own = await prisma.appointment.findFirst({ where: { id: parsed.data.excludeAppointmentId, customerId: user.customerProfileId }, select: { id: true } });
        if (own) excludeAppointmentId = own.id;
      }
    }
    // Admins may place bookings inside the minimum-notice window; customers may not.
    const { result } = await computeAvailability({ ...parsed.data, excludeAppointmentId, ignoreLeadTime: isAdmin && Boolean(excludeAppointmentId) });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: HTTP_STATUS[err.code] });
    console.error("[api/availability]", err);
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }
}
