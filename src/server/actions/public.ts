"use server";

import { prisma } from "@/server/db";
import { toActionError, type ActionResult } from "@/server/errors";
import { clientIp, enforceRateLimit } from "@/server/services/rate-limit";
import { audit } from "@/server/services/audit";
import { sendEmail } from "@/server/email/send";
import { contactAckTemplate } from "@/server/email/templates";
import { adminUserIds, notifyUsers } from "@/server/services/notifications";
import { contactSchema } from "@/lib/validations/booking";

export async function submitContactMessage(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  // Honeypot filled → silently accept without storing (do not tip off bots).
  if (parsed.data.company) return { ok: true, data: undefined };
  try {
    const ip = await clientIp();
    await enforceRateLimit("contact", ip);
    const msg = await prisma.contactMessage.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        subject: parsed.data.subject,
        message: parsed.data.message,
      },
    });
    await audit({ actorId: null, action: "contact.create", entityType: "ContactMessage", entityId: msg.id, ipAddress: ip });
    await notifyUsers(await adminUserIds(), {
      type: "CONTACT_MESSAGE",
      title: `New enquiry: ${parsed.data.subject}`,
      body: `${parsed.data.name} · ${parsed.data.email}`,
      link: "/admin/customers?tab=messages",
    });
    await sendEmail(parsed.data.email, contactAckTemplate(parsed.data.name));
    return { ok: true, data: undefined, message: "Thank you! We'll be in touch within one business day." };
  } catch (err) {
    return toActionError(err);
  }
}
