"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { requireStaff } from "@/server/session";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { audit } from "@/server/services/audit";
import { idSchema } from "@/lib/validations/booking";

const notesSchema = z.object({ appointmentId: idSchema, staffNotes: z.string().trim().max(1000) });

/** Staff may only annotate appointments assigned to them. */
export async function saveStaffNotesAction(input: unknown): Promise<ActionResult> {
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Notes must be under 1000 characters." };
  try {
    const staff = await requireStaff();
    const result = await prisma.appointment.updateMany({
      where: { id: parsed.data.appointmentId, staffId: staff.staffProfileId },
      data: { staffNotes: parsed.data.staffNotes || null },
    });
    if (result.count === 0) throw new AppError("Appointment not found.", "NOT_FOUND");
    await audit({ actorId: staff.id, action: "booking.staff_notes", entityType: "Appointment", entityId: parsed.data.appointmentId });
    revalidatePath("/staff", "layout");
    return { ok: true, data: undefined, message: "Notes saved." };
  } catch (err) {
    return toActionError(err);
  }
}
