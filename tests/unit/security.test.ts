import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/razorpay-signature";
import { sniffImageType } from "@/lib/uploads";
import { bookingAccessToken, verifyBookingAccessToken } from "@/server/services/tokens";
import { escapeHtml } from "@/server/email/templates";
import { dayOfWeekForDateKey, isValidDateKey, minuteOfDayInTz, zonedToUtc } from "@/lib/time";

describe("Razorpay signature verification", () => {
  const secret = "rzp_test_secret";
  const sig = createHmac("sha256", secret).update("order_ABC|pay_XYZ").digest("hex");

  it("accepts a valid checkout signature", () => {
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, secret)).toBe(true);
  });
  it("rejects tampered ids, wrong secrets and malformed signatures", () => {
    expect(verifyCheckoutSignature("order_ABC", "pay_OTHER", sig, secret)).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, "other")).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", "deadbeef", secret)).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, "")).toBe(false);
  });
  it("verifies webhook bodies byte-for-byte", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const wsig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wsig, "wh")).toBe(true);
    expect(verifyWebhookSignature(body + " ", wsig, "wh")).toBe(false);
    expect(verifyWebhookSignature(body, null, "wh")).toBe(false);
  });
});

describe("booking access tokens", () => {
  it("are bound to a single appointment", () => {
    const t = bookingAccessToken("appt_1");
    expect(verifyBookingAccessToken("appt_1", t)).toBe(true);
    expect(verifyBookingAccessToken("appt_2", t)).toBe(false);
    expect(verifyBookingAccessToken("appt_1", undefined)).toBe(false);
    expect(verifyBookingAccessToken("appt_1", "x".repeat(32))).toBe(false);
  });
});

describe("upload sniffing", () => {
  it("identifies real images by magic bytes", () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("jpg");
    expect(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe("png");
    expect(sniffImageType(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]))).toBe("webp");
  });
  it("rejects disguised files", () => {
    expect(sniffImageType(Buffer.from("<svg onload=alert(1)>      "))).toBeNull();
    expect(sniffImageType(Buffer.from("<?php echo 1; ?>        "))).toBeNull();
    expect(sniffImageType(Buffer.from([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull(); // .exe
  });
});

describe("output escaping", () => {
  it("escapes HTML in email templates", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe("&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;");
  });
});

describe("timezone helpers", () => {
  it("handles IST conversion and calendar maths", () => {
    expect(zonedToUtc("2030-06-01", 0, "Asia/Kolkata").toISOString()).toBe("2030-05-31T18:30:00.000Z");
    expect(minuteOfDayInTz(new Date("2030-05-31T18:30:00Z"), "Asia/Kolkata")).toBe(0);
    expect(dayOfWeekForDateKey("2030-03-12")).toBe(2);
    expect(isValidDateKey("2030-02-29")).toBe(false);
    expect(isValidDateKey("2028-02-29")).toBe(true);
  });
});
