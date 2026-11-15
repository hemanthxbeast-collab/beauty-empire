import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { env, integrations } from "@/server/env";
import type { EmailContent } from "./templates";

const resend = integrations.email ? new Resend(env.resend.apiKey) : null;

export type SendResult = { delivered: boolean; id?: string; devFile?: string };

/**
 * Sends a transactional email via Resend. Without RESEND_API_KEY (development) the email
 * is NOT sent — it is written to ./.dev-mail so links (verification, reset) can be opened locally.
 * Failures are logged and never leak to the user.
 */
export async function sendEmail(to: string, content: EmailContent): Promise<SendResult> {
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from: env.resend.from,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      if (error) {
        console.error("[email] Resend error", error.name, error.message);
        return { delivered: false };
      }
      return { delivered: true, id: data?.id };
    } catch (err) {
      console.error("[email] send failed", err);
      return { delivered: false };
    }
  }

  // DEV_MAIL_OUTBOX=true keeps the local outbox in a production build (end-to-end tests only).
  if (env.isProduction && process.env.DEV_MAIL_OUTBOX !== "true") {
    console.error("[email] RESEND_API_KEY is not configured — email not sent:", content.subject);
    return { delivered: false };
  }

  try {
    const dir = path.join(process.cwd(), ".dev-mail");
    await mkdir(dir, { recursive: true });
    const safeTo = to.replace(/[^a-z0-9@._-]/gi, "_");
    const file = path.join(dir, `${Date.now()}-${safeTo}.html`);
    await writeFile(file, `<!-- To: ${safeTo} | Subject: ${content.subject.replace(/--/g, "")} -->\n${content.html}`, "utf8");
    console.info(`[email:dev] NOT SENT (no RESEND_API_KEY). "${content.subject}" -> ${to}\n            saved to ${file}`);
    return { delivered: false, devFile: file };
  } catch (err) {
    console.error("[email:dev] could not write dev email", err);
    return { delivered: false };
  }
}
