/** Minimal, inline-styled transactional email templates. All dynamic values are HTML-escaped. */

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Row = [label: string, value: string];

const SERIF = "'Bodoni Moda',Didot,Georgia,serif";

function layout(opts: {
  preheader: string;
  heading: string;
  intro: string;
  rows?: Row[];
  cta?: { label: string; url: string };
  footer?: string;
}) {
  const rows = (opts.rows ?? [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#A77B8D;font-size:13px;width:40%">${escapeHtml(k)}</td><td style="padding:8px 0;color:#292329;font-size:14px;font-weight:600">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  const cta = opts.cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(opts.cta.url)}" style="background:#C21870;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:14px;display:inline-block">${escapeHtml(opts.cta.label)}</a></p>
       <p style="font-size:12px;color:#A77B8D;word-break:break-all">If the button does not work, copy this link into your browser:<br>${escapeHtml(opts.cta.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#FFF9F7;font-family:Inter,Segoe UI,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #F4B6CF;border-radius:20px;overflow:hidden">
<tr><td style="padding:28px 36px;border-bottom:1px solid #FCE7F0;text-align:center">
<div style="font-family:${SERIF};font-size:26px;letter-spacing:2px;color:#9D145A">BEAUTY EMPIRE</div>
<div style="font-size:11px;letter-spacing:3px;color:#A77B8D;margin-top:4px">BEAUTY · CONFIDENCE · YOU</div></td></tr>
<tr><td style="padding:32px 36px">
<h1 style="font-family:${SERIF};font-weight:500;font-size:26px;color:#292329;margin:0 0 12px">${escapeHtml(opts.heading)}</h1>
<p style="color:#4b424b;font-size:15px;line-height:1.6;margin:0 0 16px">${escapeHtml(opts.intro)}</p>
${rows ? `<table role="presentation" width="100%" style="border-top:1px solid #FCE7F0;border-bottom:1px solid #FCE7F0;margin:16px 0">${rows}</table>` : ""}
${cta}
${opts.footer ? `<p style="color:#4b424b;font-size:13px;line-height:1.6">${escapeHtml(opts.footer)}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 36px;background:#FCE7F0;color:#A77B8D;font-size:12px;text-align:center">You are receiving this email because of activity on your Beauty Empire account or booking.</td></tr>
</table></td></tr></table></body></html>`;
}

export type EmailContent = { subject: string; html: string; text: string };

function plain(heading: string, intro: string, rows: Row[] = [], url?: string) {
  return [heading, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`), url ? `\n${url}` : ""].join("\n");
}

export function verifyEmailTemplate(name: string, url: string): EmailContent {
  const intro = `Hi ${name}, welcome to Beauty Empire. Please confirm your email address to activate your account. This link expires in 24 hours.`;
  return {
    subject: "Verify your Beauty Empire account",
    html: layout({ preheader: "Confirm your email address", heading: "Confirm your email", intro, cta: { label: "Verify email", url } }),
    text: plain("Confirm your email", intro, [], url),
  };
}

export function resetPasswordTemplate(name: string, url: string): EmailContent {
  const intro = `Hi ${name}, we received a request to reset your password. This link expires in 1 hour. If you did not request this, you can safely ignore this email.`;
  return {
    subject: "Reset your Beauty Empire password",
    html: layout({ preheader: "Password reset request", heading: "Reset your password", intro, cta: { label: "Choose a new password", url } }),
    text: plain("Reset your password", intro, [], url),
  };
}

export type BookingEmailData = {
  customerName: string;
  reference: string;
  when: string;
  services: string;
  staff: string;
  total: string;
  status: string;
  payment: string;
  manageUrl: string;
};

function bookingRows(d: BookingEmailData): Row[] {
  return [
    ["Booking reference", d.reference],
    ["Date & time", d.when],
    ["Services", d.services],
    ["Professional", d.staff],
    ["Total", d.total],
    ["Status", d.status],
    ["Payment", d.payment],
  ];
}

export function bookingReceivedTemplate(d: BookingEmailData): EmailContent {
  const confirmed = d.status === "Confirmed";
  const heading = confirmed ? "Your appointment is confirmed" : "We received your booking";
  const intro = confirmed
    ? `Hi ${d.customerName}, your appointment is confirmed. We look forward to pampering you.`
    : `Hi ${d.customerName}, thank you for choosing Beauty Empire. We have received your booking request and will confirm it shortly.`;
  return {
    subject: `${heading} · ${d.reference}`,
    html: layout({
      preheader: `${d.reference} · ${d.when}`,
      heading,
      intro,
      rows: bookingRows(d),
      cta: { label: "View my booking", url: d.manageUrl },
      footer: "Need help? Reply to this email or message us on WhatsApp.",
    }),
    text: plain(heading, intro, bookingRows(d), d.manageUrl),
  };
}

export type BookingStatusKind = "confirmed" | "cancelled" | "rejected" | "rescheduled" | "completed";

export function bookingStatusTemplate(d: BookingEmailData, kind: BookingStatusKind, reason?: string | null): EmailContent {
  const map: Record<BookingStatusKind, [string, string]> = {
    confirmed: ["Your appointment is confirmed", `Hi ${d.customerName}, great news — your appointment has been confirmed.`],
    cancelled: ["Your appointment was cancelled", `Hi ${d.customerName}, your appointment has been cancelled.${reason ? ` Reason: ${reason}` : ""}`],
    rejected: [
      "We could not accept your booking",
      `Hi ${d.customerName}, unfortunately we are unable to accept this booking.${reason ? ` Reason: ${reason}` : ""} Please choose another time.`,
    ],
    rescheduled: ["Your appointment was rescheduled", `Hi ${d.customerName}, your appointment has been moved to a new time. The updated details are below.`],
    completed: [
      "Thank you for visiting",
      `Hi ${d.customerName}, thank you for visiting Beauty Empire. We would love to hear about your experience — you can leave a review from your account.`,
    ],
  };
  const [heading, intro] = map[kind];
  return {
    subject: `${heading} · ${d.reference}`,
    html: layout({ preheader: `${d.reference} · ${d.when}`, heading, intro, rows: bookingRows(d), cta: { label: "View my booking", url: d.manageUrl } }),
    text: plain(heading, intro, bookingRows(d), d.manageUrl),
  };
}

export function reminderTemplate(d: BookingEmailData): EmailContent {
  const heading = "Your appointment is coming up";
  const intro = `Hi ${d.customerName}, this is a friendly reminder about your upcoming appointment at Beauty Empire.`;
  return {
    subject: `Reminder: ${d.when} · ${d.reference}`,
    html: layout({ preheader: d.when, heading, intro, rows: bookingRows(d), cta: { label: "View my booking", url: d.manageUrl } }),
    text: plain(heading, intro, bookingRows(d), d.manageUrl),
  };
}

export function contactAckTemplate(name: string): EmailContent {
  const heading = "Thank you for reaching out";
  const intro = `Hi ${name}, we have received your message and a member of our team will get back to you within one business day.`;
  return { subject: "We received your message — Beauty Empire", html: layout({ preheader: heading, heading, intro }), text: plain(heading, intro) };
}
