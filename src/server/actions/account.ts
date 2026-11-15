"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireCustomer } from "@/server/session";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { enforceRateLimit } from "@/server/services/rate-limit";
import { profileSchema } from "@/lib/validations/booking";
import { dateKeyToDbDate } from "@/lib/time";

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  try {
    await enforceRateLimit("account");
    const user = await requireCustomer();
    const d = parsed.data;
    if (d.preferredStaffId) {
      const exists = await prisma.staffProfile.findFirst({ where: { id: d.preferredStaffId, isBookable: true }, select: { id: true } });
      if (!exists) throw new AppError("Selected professional is not available.", "VALIDATION");
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name: d.name, phone: d.phone } }),
      prisma.customerProfile.update({
        where: { id: user.customerProfileId },
        data: {
          dateOfBirth: d.dateOfBirth ? dateKeyToDbDate(d.dateOfBirth) : null,
          skinType: d.skinType ?? null,
          hairType: d.hairType ?? null,
          preferences: d.preferences ?? null,
          preferredStaffId: d.preferredStaffId ?? null,
          marketingOptIn: d.marketingOptIn,
        },
      }),
    ]);
    revalidatePath("/account", "layout");
    return { ok: true, data: undefined, message: "Profile updated." };
  } catch (err) {
    return toActionError(err);
  }
}
