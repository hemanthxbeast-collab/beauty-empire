"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/session";
import { toActionError, type ActionResult } from "@/server/errors";

export async function markNotificationsReadAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  } catch (err) {
    return toActionError(err);
  }
}
