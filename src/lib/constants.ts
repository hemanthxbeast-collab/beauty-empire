export const SITE_NAME = "Beauty Empire";
export const SITE_DESCRIPTION =
  "Beauty Empire is a premium women's beauty parlour offering bespoke facials, hair artistry, bridal makeup and self-care rituals.";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Services" },
  { href: "/bridal", label: "Bridal Studio" },
  { href: "/gallery", label: "Gallery" },
  { href: "/offers", label: "Offers" },
  { href: "/contact", label: "Contact Us" },
] as const;

export const BLOCKING_STATUSES = ["PENDING", "CONFIRMED"] as const;

export const GALLERY_CATEGORY_LABELS = {
  BRIDAL_MAKEUP: "Bridal Makeup",
  HAIRSTYLES: "Hairstyles",
  FACIAL_TREATMENTS: "Facial Treatments",
  HAIR_TRANSFORMATIONS: "Hair Transformations",
  NAIL_ART: "Nail Art",
  SALON_INTERIORS: "Salon Interiors",
} as const;

export type GalleryCategoryKey = keyof typeof GALLERY_CATEGORY_LABELS;

export const APPOINTMENT_STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  NO_SHOW: "No-show",
} as const;

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Pay at salon",
  PENDING: "Payment pending",
  PAID: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
} as const;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Hosts allowed for remote images (also mirrored in next.config.ts). */
export const ALLOWED_IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com"] as const;
