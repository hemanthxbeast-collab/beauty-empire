import { z } from "zod";
import { ALLOWED_IMAGE_HOSTS } from "@/lib/constants";
import { dateKeySchema, idSchema } from "./booking";
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from "./auth";

/** Image URLs must be our own uploads or an allow-listed CDN (prevents arbitrary hot-linking / tracking pixels). */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine(
    (v) => {
      if (v.startsWith("/uploads/") || v.startsWith("/images/")) return /^\/[a-zA-Z0-9/_.-]+$/.test(v) && !v.includes("..");
      try {
        const u = new URL(v);
        return u.protocol === "https:" && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(u.hostname);
      } catch {
        return false;
      }
    },
    { message: "Use an uploaded image or an https URL from Cloudinary / Unsplash" },
  );

const optionalImage = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined))
  .pipe(imageUrlSchema.optional());

const money = z.coerce
  .number({ message: "Enter an amount" })
  .min(0, "Amount cannot be negative")
  .max(1_000_000, "Amount is too large")
  .transform((v) => Math.round(v * 100) / 100);

const optionalMoney = z
  .union([z.literal(""), z.null(), z.coerce.number()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? undefined : Math.round(Number(v) * 100) / 100))
  .pipe(z.number().min(0).max(1_000_000).optional());

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
  .max(80)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const categorySchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional(),
  imageUrl: optionalImage,
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const serviceSchema = z
  .object({
    id: idSchema.optional(),
    categoryId: idSchema,
    name: z.string().trim().min(2, "Name is required").max(120),
    slug: slugSchema,
    shortDescription: z.string().trim().min(10, "Add a short description").max(240),
    description: z.string().trim().min(20, "Add a detailed description").max(5000),
    price: money,
    discountPrice: optionalMoney,
    durationMinutes: z.coerce.number().int().min(5, "Minimum 5 minutes").max(720, "Maximum 12 hours"),
    imageUrl: optionalImage,
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    isFeatured: z.coerce.boolean().default(false),
    isBridal: z.coerce.boolean().default(false),
    displayOrder: z.coerce.number().int().min(0).max(999).default(0),
    staffIds: z.array(idSchema).default([]),
  })
  .refine((d) => d.discountPrice === undefined || d.discountPrice < d.price, {
    message: "Discount price must be lower than the regular price",
    path: ["discountPrice"],
  });
export type ServiceFormInput = z.input<typeof serviceSchema>;

export const packageSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().min(10).max(5000),
  price: money,
  imageUrl: optionalImage,
  isBridal: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  serviceIds: z.array(idSchema).min(1, "Choose at least one service"),
});

export const offerSchema = z
  .object({
    id: idSchema.optional(),
    title: z.string().trim().min(3).max(120),
    slug: slugSchema,
    description: z.string().trim().min(10).max(1000),
    imageUrl: optionalImage,
    originalPrice: money,
    discountPercent: z.coerce.number().int().min(1, "At least 1%").max(90, "At most 90%"),
    validFrom: dateKeySchema,
    validUntil: dateKeySchema,
    isActive: z.coerce.boolean().default(true),
    terms: z.string().trim().max(1000).optional(),
    displayOrder: z.coerce.number().int().min(0).max(999).default(0),
    serviceIds: z.array(idSchema).default([]),
  })
  .refine((d) => d.validUntil >= d.validFrom, { message: "End date must be after start date", path: ["validUntil"] });

export const galleryImageSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  altText: z.string().trim().min(3, "Describe the image for screen readers").max(200),
  imageUrl: imageUrlSchema,
  category: z.enum(["BRIDAL_MAKEUP", "HAIRSTYLES", "FACIAL_TREATMENTS", "HAIR_TRANSFORMATIONS", "NAIL_ART", "SALON_INTERIORS"]),
  isPublished: z.coerce.boolean().default(true),
  showOnInstagram: z.coerce.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const staffCreateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  title: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(1000).optional(),
  photoUrl: optionalImage,
  specialties: z.array(z.string().trim().min(2).max(40)).max(12).default([]),
  yearsOfExperience: z.coerce.number().int().min(0).max(60).default(0),
  serviceIds: z.array(idSchema).default([]),
});

export const staffUpdateSchema = staffCreateSchema.omit({ password: true, email: true }).extend({
  staffId: idSchema,
  isBookable: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const availabilityDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isAvailable: z.boolean(),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((d) => !d.isAvailable || d.end > d.start, { message: "End must be after start", path: ["end"] });

export const availabilitySchema = z.object({
  staffId: idSchema.optional(),
  days: z.array(availabilityDaySchema).length(7),
});

export const leaveSchema = z
  .object({
    staffId: idSchema.optional(),
    startDate: dateKeySchema,
    endDate: dateKeySchema,
    reason: z.string().trim().max(300).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, { message: "End date must be on or after start date", path: ["endDate"] });

export const bookingStatusUpdateSchema = z.object({
  appointmentId: idSchema,
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"]),
  reason: z.string().trim().max(500).optional(),
});

export const adminRescheduleSchema = z.object({
  appointmentId: idSchema,
  date: dateKeySchema,
  minuteOfDay: z.coerce.number().int().min(0).max(1439),
  staffId: idSchema.optional(),
});

export const assignStaffSchema = z.object({ appointmentId: idSchema, staffId: idSchema });

export const reviewModerationSchema = z.object({
  reviewId: idSchema,
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  isFeatured: z.coerce.boolean().optional(),
});

const dayHoursSchema = z
  .object({
    closed: z.boolean(),
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((d) => d.closed || d.close > d.open, { message: "Closing must be after opening", path: ["close"] });

const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.url({ protocol: /^https$/, message: "Use a full https:// URL" }).optional());

export const settingsSchema = z.object({
  salonName: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
  phone: phoneSchema,
  whatsappNumber: phoneSchema,
  email: emailSchema,
  googleMapsEmbedUrl: optionalUrl.refine((v) => !v || v.startsWith("https://www.google.com/maps"), {
    message: "Use a https://www.google.com/maps embed URL (Share → Embed a map)",
  }),
  googleMapsLink: optionalUrl,
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  businessHours: z.array(dayHoursSchema).length(7),
  slotIntervalMinutes: z.coerce.number().int().refine((v) => [15, 20, 30, 45, 60].includes(v), "Choose 15, 20, 30, 45 or 60"),
  minLeadTimeMinutes: z.coerce.number().int().min(0).max(10080),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  autoConfirmBookings: z.coerce.boolean(),
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
  bookingPolicy: z.string().trim().min(10).max(5000),
  cancellationPolicy: z.string().trim().min(10).max(5000),
  onlinePaymentsEnabled: z.coerce.boolean(),
  payAtSalonEnabled: z.coerce.boolean(),
});
export type SettingsInput = z.input<typeof settingsSchema>;
