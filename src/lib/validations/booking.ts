import { z } from "zod";
import { isValidDateKey } from "@/lib/time";
import { emailSchema, nameSchema, phoneSchema } from "./auth";

export const idSchema = z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9_-]+$/, "Invalid id");

export const dateKeySchema = z.string().refine(isValidDateKey, { message: "Choose a valid date" });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const customerDetailsSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  notes: optionalText(1000),
  specialRequirements: optionalText(1000),
});

export const paymentMethodSchema = z.enum(["PAY_AT_SALON", "RAZORPAY"]);

export const createBookingSchema = z.object({
  serviceIds: z.array(idSchema).min(1, "Select at least one service").max(6, "You can book up to 6 services at once"),
  staffId: z.union([idSchema, z.literal("any")]),
  date: dateKeySchema,
  minuteOfDay: z.coerce.number().int().min(0).max(1439),
  customer: customerDetailsSchema,
  paymentMethod: paymentMethodSchema,
  offerId: idSchema.optional(),
  idempotencyKey: z.uuid().optional(),
  acceptPolicy: z.literal(true, { message: "Please accept the booking policy" }),
});
export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const availabilityQuerySchema = z.object({
  serviceIds: z.array(idSchema).min(1).max(6),
  staffId: z.union([idSchema, z.literal("any")]),
  date: dateKeySchema,
  excludeAppointmentId: idSchema.optional(),
});

export const cancelBookingSchema = z.object({
  appointmentId: idSchema,
  reason: optionalText(500),
});

export const rescheduleRequestSchema = z.object({
  appointmentId: idSchema,
  date: dateKeySchema,
  minuteOfDay: z.coerce.number().int().min(0).max(1439),
  note: optionalText(500),
});

export const reviewSchema = z.object({
  appointmentId: idSchema,
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: optionalText(120),
  comment: z.string().trim().min(10, "Please write at least 10 characters").max(1500),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(phoneSchema.optional()),
  subject: z.string().trim().min(3, "Please add a subject").max(160),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(3000),
  // Honeypot — must stay empty (bots fill every field)
  company: z.string().max(0).optional(),
});
export type ContactInput = z.input<typeof contactSchema>;

export const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  dateOfBirth: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(dateKeySchema.optional()),
  skinType: optionalText(60),
  hairType: optionalText(60),
  preferences: optionalText(1000),
  preferredStaffId: z
    .string()
    .optional()
    .transform((v) => (v && v !== "none" ? v : undefined))
    .pipe(idSchema.optional()),
  marketingOptIn: z.boolean().default(false),
});
export type ProfileInput = z.input<typeof profileSchema>;
