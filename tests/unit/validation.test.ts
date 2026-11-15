import { describe, expect, it } from "vitest";
import { passwordSchema, phoneSchema, registerSchema, loginSchema, emailSchema } from "@/lib/validations/auth";
import { contactSchema, createBookingSchema, reviewSchema } from "@/lib/validations/booking";
import { imageUrlSchema, offerSchema, serviceSchema, settingsSchema } from "@/lib/validations/admin";
import { safeNext } from "@/lib/auth-client";

describe("auth validation", () => {
  it("enforces a strong password policy", () => {
    expect(passwordSchema.safeParse("short1!A").success).toBe(true);
    for (const weak of ["short", "alllowercase1!", "ALLUPPER1!", "NoDigits!!", "NoSymbol123"]) {
      expect(passwordSchema.safeParse(weak).success, weak).toBe(false);
    }
  });

  it("normalises Indian mobile numbers", () => {
    expect(phoneSchema.parse("98765 43210")).toBe("+919876543210");
    expect(phoneSchema.parse("+91-98765-43210")).toBe("+919876543210");
    expect(phoneSchema.parse("098765 43210")).toBe("+919876543210");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("5876543210").success).toBe(false);
  });

  it("lower-cases and validates email", () => {
    expect(emailSchema.parse("  Riya@Example.COM ")).toBe("riya@example.com");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("rejects mismatched confirmation and unaccepted terms on registration", () => {
    const base = { name: "Riya Malhotra", email: "riya@example.com", phone: "9876543210", password: "Str0ng!Pass", confirmPassword: "Str0ng!Pass", acceptTerms: true };
    expect(registerSchema.safeParse(base).success).toBe(true);
    const mismatch = registerSchema.safeParse({ ...base, confirmPassword: "Different1!" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(registerSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, name: "<script>" }).success).toBe(false);
  });

  it("reports a password mismatch even when other fields are also invalid", () => {
    const r = registerSchema.safeParse({ name: "Riya Malhotra", email: "riya@example.com", phone: "9876543210", password: "weak", confirmPassword: "other", acceptTerms: false });
    const paths = r.error?.issues.map((i) => i.path.join("."));
    expect(paths).toContain("password");
    expect(paths).toContain("confirmPassword");
    expect(paths).toContain("acceptTerms");
  });

  it("requires a password on login", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("only allows same-site relative redirects", () => {
    expect(safeNext("/account")).toBe("/account");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});

describe("booking & form validation", () => {
  const booking = {
    serviceIds: ["svc1"],
    staffId: "any",
    date: "2030-03-12",
    minuteOfDay: 600,
    customer: { name: "Riya Malhotra", email: "riya@example.com", phone: "9876543210" },
    paymentMethod: "PAY_AT_SALON",
    acceptPolicy: true,
  };
  it("accepts a valid booking", () => expect(createBookingSchema.safeParse(booking).success).toBe(true));
  it("rejects invalid dates, empty services and unaccepted policy", () => {
    expect(createBookingSchema.safeParse({ ...booking, date: "2030-02-30" }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...booking, serviceIds: [] }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...booking, acceptPolicy: false }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...booking, minuteOfDay: 2000 }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...booking, staffId: "'; DROP TABLE" }).success).toBe(false);
  });
  it("rejects bot submissions via the honeypot", () => {
    expect(contactSchema.safeParse({ name: "Bot Name", email: "b@x.co", subject: "Hello", message: "Hello there friend", company: "spam inc" }).success).toBe(false);
  });
  it("bounds review ratings", () => {
    expect(reviewSchema.safeParse({ appointmentId: "a1", rating: 6, comment: "Lovely service, thanks" }).success).toBe(false);
    expect(reviewSchema.safeParse({ appointmentId: "a1", rating: 5, comment: "Lovely service, thanks" }).success).toBe(true);
  });
});

describe("admin validation", () => {
  it("allow-lists image sources", () => {
    expect(imageUrlSchema.safeParse("https://res.cloudinary.com/demo/image/upload/x.jpg").success).toBe(true);
    expect(imageUrlSchema.safeParse("https://images.unsplash.com/photo-1?w=100").success).toBe(true);
    expect(imageUrlSchema.safeParse("/uploads/services/a.webp").success).toBe(true);
    expect(imageUrlSchema.safeParse("http://res.cloudinary.com/x.jpg").success).toBe(false);
    expect(imageUrlSchema.safeParse("https://evil.example/tracker.gif").success).toBe(false);
    expect(imageUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(imageUrlSchema.safeParse("/uploads/../../etc/passwd").success).toBe(false);
  });

  it("requires discount price below price", () => {
    const svc = { categoryId: "c1", name: "Gold Facial", shortDescription: "A short description", description: "A much longer description text", price: 1000, durationMinutes: 60 };
    expect(serviceSchema.safeParse(svc).success).toBe(true);
    expect(serviceSchema.safeParse({ ...svc, discountPrice: 1200 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...svc, durationMinutes: 0 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...svc, price: -5 }).success).toBe(false);
  });

  it("validates offer dates and discount range", () => {
    const offer = { title: "Festive", description: "Festive offer description", originalPrice: 2000, discountPercent: 20, validFrom: "2030-01-01", validUntil: "2030-02-01" };
    expect(offerSchema.safeParse(offer).success).toBe(true);
    expect(offerSchema.safeParse({ ...offer, validUntil: "2029-12-01" }).success).toBe(false);
    expect(offerSchema.safeParse({ ...offer, discountPercent: 95 }).success).toBe(false);
  });

  it("validates business hours in settings", () => {
    const day = { closed: false, open: "10:00", close: "20:00" };
    const settings = {
      salonName: "Beauty Empire",
      tagline: "x",
      addressLine1: "Road 1",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500034",
      phone: "9876543210",
      whatsappNumber: "9876543210",
      email: "a@b.co",
      businessHours: Array(7).fill(day),
      slotIntervalMinutes: 30,
      minLeadTimeMinutes: 60,
      maxAdvanceDays: 60,
      bufferMinutes: 0,
      autoConfirmBookings: false,
      cancellationWindowHours: 24,
      bookingPolicy: "Some booking policy",
      cancellationPolicy: "Some cancellation policy",
      onlinePaymentsEnabled: false,
      payAtSalonEnabled: true,
    };
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...settings, businessHours: [{ closed: false, open: "20:00", close: "10:00" }, ...Array(6).fill(day)] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, googleMapsEmbedUrl: "https://evil.example/embed" }).success).toBe(false);
  });
});
