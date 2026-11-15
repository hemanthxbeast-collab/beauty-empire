import { NextResponse, type NextRequest } from "next/server";
import { AppError, HTTP_STATUS } from "@/server/errors";
import { computeAvailability } from "@/server/services/availability";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { availabilityQuerySchema } from "@/lib/validations/booking";
import { getCurrentUser } from "@/server/session";

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
    // Only administrators may ignore an existing booking (used when rescheduling it).
    let excludeAppointmentId: string | undefined;
    if (parsed.data.excludeAppointmentId) {
      const user = await getCurrentUser();
      if (user?.role === "ADMIN") excludeAppointmentId = parsed.data.excludeAppointmentId;
    }
    const { result } = await computeAvailability({ ...parsed.data, excludeAppointmentId, ignoreLeadTime: Boolean(excludeAppointmentId) });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: HTTP_STATUS[err.code] });
    console.error("[api/availability]", err);
    return NextResponse.json({ error: "Could not load availability" }, { status: 500 });
  }
}
