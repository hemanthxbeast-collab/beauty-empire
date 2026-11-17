/**
 * Beauty Empire seed script — idempotent (safe to run repeatedly).
 *
 *   npm run db:seed
 *
 * Creates salon settings, the service catalogue, staff, gallery, offers and packages.
 * Accounts are only created when their passwords are supplied via environment variables
 * (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD, SEED_STAFF_PASSWORD, SEED_CUSTOMER_PASSWORD).
 * SAMPLE content (fictional staff, offers, packages, stock gallery photos, demo customers, bookings
 * and reviews) is only created outside production and unless SEED_DEMO_DATA=false. A production
 * seed creates settings (placeholder contact details to replace in Admin → Settings), the service
 * menu and the admin account only. No credentials are hard-coded.
 */
import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { TZDate } from "@date-fns/tz";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { IMG, unsplash } from "../src/lib/images";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const TZ = process.env.SALON_TIMEZONE || "Asia/Kolkata";
const isProd = process.env.NODE_ENV === "production";
const sampleContent = process.env.SEED_DEMO_DATA !== "false" && !isProd;

const slug = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ───────────────────────── Catalogue ─────────────────────────

type SvcSeed = [name: string, price: number, minutes: number, short: string, image: string, opts?: { featured?: boolean; discount?: number }];

const CATALOGUE: Array<{ name: string; description: string; image: string; bridal?: boolean; services: SvcSeed[] }> = [
  {
    name: "Facial & Skincare",
    description: "Results-driven facials and skin rituals tailored to your skin type, using premium professional formulations.",
    image: IMG.facialMask,
    services: [
      ["Classic Facial", 1499, 60, "A deep-cleansing, hydrating facial that restores balance and a healthy glow.", IMG.facialMask],
      ["Hydra Facial", 3999, 75, "Multi-step hydradermabrasion that cleanses, exfoliates and infuses intense hydration.", IMG.facialTreatment, { featured: true, discount: 3499 }],
      ["Gold Facial", 2499, 75, "A luxurious 24K gold-infused ritual for radiance, firmness and a lit-from-within finish.", IMG.facialGold, { featured: true }],
      ["Diamond Facial", 2999, 75, "Micro-polishing diamond dust treatment that refines texture and revives dull skin.", IMG.spaTreatment],
      ["Anti-Acne Facial", 1999, 60, "Clarifying treatment that calms breakouts, decongests pores and soothes inflammation.", IMG.facialMassage],
      ["Skin Brightening Treatment", 2799, 60, "Targeted brightening for uneven tone and pigmentation with vitamin C actives.", IMG.dropper],
      ["Clean-Up", 899, 45, "A quick refresh — cleanse, steam, extraction and a calming mask.", IMG.facialMask],
      ["De-Tan Treatment", 799, 30, "Removes sun tan and restores your natural skin tone on face and neck.", IMG.serum],
      ["Face Masks", 699, 30, "Customised masks — hydrating, purifying or brightening — chosen for your skin.", IMG.facialTreatment],
      ["Skin Rejuvenation", 3499, 90, "Our signature anti-ageing ritual with lifting massage, peptides and collagen mask.", IMG.facialGold],
    ],
  },
  {
    name: "Hair Services",
    description: "Precision cuts, lived-in colour and restorative treatments by our creative hair team.",
    image: IMG.hairStyling,
    services: [
      ["Haircut and Styling", 999, 60, "Consultation, precision cut and a polished blow-dry finish tailored to your face shape.", IMG.hairStyling, { featured: true }],
      ["Hair Spa", 1499, 60, "Nourishing hair spa with scalp massage, steam and deep-conditioning mask.", IMG.hairWash, { featured: true }],
      ["Hair Smoothening", 5999, 180, "Frizz-control smoothening for soft, manageable, naturally straight hair.", IMG.hairLong],
      ["Hair Straightening", 6999, 210, "Long-lasting straightening for sleek, glossy, poker-straight results.", IMG.hairBlonde],
      ["Hair Coloring", 2999, 120, "Global colour with ammonia-free formulas for rich, long-lasting shade.", IMG.hairPortrait],
      ["Hair Highlights", 3999, 150, "Hand-painted highlights and balayage for dimension and movement.", IMG.hairWaves],
      ["Hair Wash and Blow Dry", 599, 45, "Luxury wash, conditioning and a bouncy professional blow-dry.", IMG.hairWash2],
      ["Hair Treatments", 2499, 90, "Keratin and protein treatments to repair damage and restore shine.", IMG.hairCurl],
    ],
  },
  {
    name: "Bridal & Occasion",
    description: "Timeless bridal artistry and occasion styling — from engagement to reception.",
    image: IMG.bride1,
    bridal: true,
    services: [
      ["Bridal Makeup", 24999, 240, "Signature HD/airbrush bridal look with trial consultation, lashes and dupatta setting.", IMG.bride1, { featured: true }],
      ["Engagement Makeup", 12999, 150, "Soft-glam engagement look designed around your outfit and jewellery.", IMG.bride4],
      ["Reception Makeup", 14999, 180, "Elegant evening glamour built to last through photographs and celebrations.", IMG.bride6],
      ["Pre-Bridal Packages", 9999, 180, "Customised pre-wedding skin and hair rituals for a radiant big day.", IMG.mehndi1],
      ["Bridal Hairstyling", 4999, 90, "Classic buns, braids and contemporary bridal hairstyles with accessory setting.", IMG.bride3],
      ["Saree Draping", 999, 30, "Expert draping in Nivi, Bengali, Gujarati and contemporary styles.", IMG.saree2],
      ["Party Makeup", 3999, 90, "Camera-ready party glam with lashes — from subtle to statement.", IMG.makeupLips, { featured: true }],
      ["Special Occasion Styling", 2999, 75, "Complete hair and makeup styling for festivals, functions and events.", IMG.saree5],
    ],
  },
  {
    name: "Eyebrows & Threading",
    description: "Precise, gentle threading and brow design that frames your features beautifully.",
    image: IMG.threading,
    services: [
      ["Eyebrow Shaping", 199, 15, "Brow mapping and shaping to complement your natural face structure.", IMG.brows],
      ["Eyebrow Threading", 99, 10, "Clean, precise eyebrow threading by experienced hands.", IMG.threading],
      ["Upper Lip Threading", 49, 10, "Quick and gentle upper lip hair removal.", IMG.threading],
      ["Full Face Threading", 349, 30, "Complete facial threading for smooth, refined skin.", IMG.threading],
      ["Forehead Threading", 59, 10, "Tidy forehead threading for a clean finish.", IMG.brows],
    ],
  },
  {
    name: "Waxing & Body Care",
    description: "Hygienic, single-use waxing and indulgent body rituals for silky smooth skin.",
    image: IMG.waxHoney,
    services: [
      ["Full Body Waxing", 2999, 120, "Complete body waxing using premium low-temperature wax.", IMG.waxHoney],
      ["Arms and Legs Waxing", 1199, 60, "Full arms and full legs waxing for long-lasting smoothness.", IMG.waxWarmer],
      ["Underarm Waxing", 199, 15, "Gentle underarm waxing with soothing after-care.", IMG.waxHoney],
      ["Rica Waxing", 799, 30, "Italian Rica liposoluble wax — kinder to sensitive skin (full arms).", IMG.waxWarmer],
      ["Body Polishing", 3499, 90, "Full-body exfoliation, polish and hydration for luminous skin.", IMG.massageOil],
    ],
  },
  {
    name: "Manicure & Pedicure",
    description: "Meticulous nail care and on-trend nail art in a relaxing, hygienic setting.",
    image: IMG.nailsPastel,
    services: [
      ["Classic Manicure", 599, 40, "Shaping, cuticle care, hand massage and polish of your choice.", IMG.nailsPaint],
      ["Premium Manicure", 999, 60, "Spa manicure with exfoliation, mask, extended massage and gel polish.", IMG.nailsNude],
      ["Pedicure", 799, 50, "Relaxing foot soak, scrub, callus care, massage and polish.", IMG.nailsPastel],
      ["Nail Art", 699, 45, "Hand-painted nail art — florals, chrome, French and custom designs.", IMG.nailsArt, { featured: true }],
      ["Nail Extensions", 1999, 90, "Gel or acrylic extensions sculpted to your preferred length and shape.", IMG.nailsDark],
    ],
  },
  {
    name: "Additional Beauty Services",
    description: "Lashes, finishing touches and relaxation treatments to complete your self-care ritual.",
    image: IMG.lashes1,
    services: [
      ["Eyelash Extensions", 2499, 90, "Classic or volume lash extensions applied lash by lash.", IMG.lashes1, { featured: true }],
      ["Lash Lifting", 1799, 60, "Lift and tint for naturally curled, defined lashes for weeks.", IMG.lashes2],
      ["Hair Removal", 499, 30, "Gentle facial hair removal with peel-off wax for sensitive areas.", IMG.lashes3],
      ["Hand and Foot Care", 1299, 60, "Paraffin treatment, exfoliation and massage for soft hands and feet.", IMG.nailsNude],
      ["Relaxation Treatments", 2499, 60, "Aromatherapy head, neck and shoulder massage to melt away stress.", IMG.massageStone],
    ],
  },
];

const STAFF = [
  {
    key: "ananya",
    name: "Ananya Sharma",
    email: "ananya@beautyempire.test",
    phone: "+919000000001",
    title: "Senior Bridal Makeup Artist",
    bio: "With over a decade of bridal artistry, Ananya creates timeless, camera-perfect looks for brides across India.",
    specialties: ["Bridal Makeup", "HD & Airbrush", "Saree Draping"],
    years: 11,
    categories: ["Bridal & Occasion", "Eyebrows & Threading"],
    offDay: 2,
  },
  {
    key: "priya",
    name: "Priya Nair",
    email: "priya@beautyempire.test",
    phone: "+919000000002",
    title: "Skin Specialist & Aesthetician",
    bio: "Priya combines clinical skincare knowledge with relaxing rituals for visible, lasting results.",
    specialties: ["Advanced Facials", "Skin Analysis", "Anti-Ageing"],
    years: 8,
    categories: ["Facial & Skincare", "Additional Beauty Services", "Eyebrows & Threading"],
    offDay: 3,
  },
  {
    key: "meera",
    name: "Meera Kapoor",
    email: "meera@beautyempire.test",
    phone: "+919000000003",
    title: "Creative Hair Director",
    bio: "Meera's precision cuts and lived-in colour have made her the go-to stylist for effortless, modern hair.",
    specialties: ["Precision Cuts", "Balayage", "Keratin"],
    years: 9,
    categories: ["Hair Services"],
    offDay: 1,
  },
  {
    key: "sana",
    name: "Sana Qureshi",
    email: "sana@beautyempire.test",
    phone: "+919000000004",
    title: "Nail & Lash Artist",
    bio: "Sana is known for intricate nail art and flawless lash work, with an eye for detail in every set.",
    specialties: ["Nail Art", "Extensions", "Lash Lifts"],
    years: 6,
    categories: ["Manicure & Pedicure", "Additional Beauty Services"],
    offDay: 4,
  },
  {
    key: "kavya",
    name: "Kavya Reddy",
    email: "kavya@beautyempire.test",
    phone: "+919000000005",
    title: "Beauty & Body Therapist",
    bio: "Kavya's gentle touch makes waxing, threading and body rituals a calm, comfortable experience.",
    specialties: ["Rica Waxing", "Body Polishing", "Threading"],
    years: 7,
    categories: ["Waxing & Body Care", "Eyebrows & Threading", "Facial & Skincare"],
    offDay: 5,
  },
];

const DEFAULT_HOURS = {
  "0": { open: 600, close: 1140, closed: false },
  "1": { open: 600, close: 1200, closed: false },
  "2": { open: 600, close: 1200, closed: false },
  "3": { open: 600, close: 1200, closed: false },
  "4": { open: 600, close: 1200, closed: false },
  "5": { open: 600, close: 1260, closed: false },
  "6": { open: 540, close: 1260, closed: false },
};

// ───────────────────────── Helpers ─────────────────────────

async function upsertCredentialUser(opts: { name: string; email: string; phone?: string; role: "ADMIN" | "STAFF" | "CUSTOMER"; password: string }) {
  const email = opts.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  const hash = await hashPassword(opts.password);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: opts.role, emailVerified: true, isActive: true, name: opts.name, phone: opts.phone } });
    const account = await prisma.account.findFirst({ where: { userId: existing.id, providerId: "credential" } });
    if (account) await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
    else await prisma.account.create({ data: { id: randomUUID(), userId: existing.id, accountId: existing.id, providerId: "credential", password: hash } });
    return existing.id;
  }
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: opts.name,
      email,
      phone: opts.phone,
      role: opts.role,
      emailVerified: true,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hash } },
    },
  });
  return id;
}

function at(dayOffset: number, minuteOfDay: number) {
  const now = new TZDate(Date.now(), TZ);
  const d = new TZDate(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, TZ);
  return new Date(d.getTime());
}

function dateOnly(dayOffset: number) {
  const now = new TZDate(Date.now(), TZ);
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset));
}

function reference() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return "BE-" + [...randomBytes(8)].map((b) => alphabet[b % alphabet.length]).join("");
}

// ───────────────────────── Main ─────────────────────────

async function main() {
  console.log("🌸 Seeding Beauty Empire…");

  await prisma.salonSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      salonName: "Beauty Empire",
      tagline: "Beauty. Confidence. You.",
      addressLine1: "Plot 24, Rose Garden Avenue",
      addressLine2: "Road No. 12, Banjara Hills",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500034",
      phone: "+919876543210",
      whatsappNumber: "+919876543210",
      email: "hello@beautyempire.test",
      googleMapsEmbedUrl: "https://www.google.com/maps?q=Banjara+Hills,+Hyderabad&output=embed",
      googleMapsLink: "https://www.google.com/maps/search/?api=1&query=Banjara+Hills+Hyderabad",
      // Social links stay empty until the salon's real profiles are entered in Admin → Settings.
      instagramUrl: null,
      facebookUrl: null,
      youtubeUrl: null,
      timezone: TZ,
      businessHours: DEFAULT_HOURS,
      slotIntervalMinutes: 30,
      minLeadTimeMinutes: 120,
      maxAdvanceDays: 60,
      bufferMinutes: 0,
      autoConfirmBookings: false,
      cancellationWindowHours: 24,
      onlinePaymentsEnabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      payAtSalonEnabled: true,
      bookingPolicy:
        "Please arrive 10 minutes before your appointment. Bookings are confirmed by our team within a few hours. Bridal bookings include a consultation call. Late arrivals beyond 15 minutes may need to be rescheduled to avoid delaying other guests.",
      cancellationPolicy:
        "You may cancel or request to reschedule online up to 24 hours before your appointment at no charge. For changes within 24 hours, please call or WhatsApp the salon. Online prepayments for cancelled appointments are refunded to the original payment method within 5–7 business days.",
    },
  });

  // Catalogue
  const serviceIdByName = new Map<string, string>();
  const categoryIdByName = new Map<string, string>();
  for (const [ci, cat] of CATALOGUE.entries()) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: slug(cat.name) },
      update: { name: cat.name, description: cat.description, imageUrl: unsplash(cat.image, 900, 1100), displayOrder: ci },
      create: { name: cat.name, slug: slug(cat.name), description: cat.description, imageUrl: unsplash(cat.image, 900, 1100), displayOrder: ci },
    });
    categoryIdByName.set(cat.name, category.id);
    for (const [si, [name, price, minutes, short, image, opts]] of cat.services.entries()) {
      const description = `${short}\n\nEvery ${name.toLowerCase()} begins with a personal consultation so we can tailor products and techniques to you. Our professionals use premium, salon-grade products and follow strict hygiene protocols — fresh linen, sterilised tools and single-use consumables for every guest.\n\nDuration is approximate and may vary with hair length, skin needs or design complexity.`;
      const svc = await prisma.service.upsert({
        where: { slug: slug(name) },
        update: {},
        create: {
          categoryId: category.id,
          name,
          slug: slug(name),
          shortDescription: short,
          description,
          price: new Prisma.Decimal(price),
          discountPrice: opts?.discount ? new Prisma.Decimal(opts.discount) : null,
          durationMinutes: minutes,
          imageUrl: unsplash(image, 900, 1100),
          isFeatured: Boolean(opts?.featured),
          isBridal: Boolean(cat.bridal),
          displayOrder: si,
        },
      });
      serviceIdByName.set(name, svc.id);
    }
  }
  console.log(`  ✓ ${serviceIdByName.size} services in ${CATALOGUE.length} categories`);

  // Accounts
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    await upsertCredentialUser({ name: "Salon Administrator", email: adminEmail, role: "ADMIN", password: adminPassword });
    console.log(`  ✓ admin account ${adminEmail}`);
  } else {
    console.log("  • SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin account");
  }

  const staffIds: Record<string, string> = {};
  if (!sampleContent) {
    console.log("  • production / SEED_DEMO_DATA=false: skipping sample staff, offers, packages, gallery and demo data");
  } else {
    // Staff
    const staffPassword = process.env.SEED_STAFF_PASSWORD;
    for (const [i, s] of STAFF.entries()) {
      let userId = (await prisma.user.findUnique({ where: { email: s.email } }))?.id;
      if (staffPassword && !isProd) {
        userId = await upsertCredentialUser({ name: s.name, email: s.email, phone: s.phone, role: "STAFF", password: staffPassword });
      } else if (!userId) {
        // Staff profile without login credentials — admin can reset the password later.
        userId = randomUUID();
        await prisma.user.create({ data: { id: userId, name: s.name, email: s.email, phone: s.phone, role: "STAFF", emailVerified: true } });
      }
      const profile = await prisma.staffProfile.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          slug: slug(s.name),
          title: s.title,
          bio: s.bio,
          specialties: s.specialties,
          yearsOfExperience: s.years,
          displayOrder: i,
        },
      });
      staffIds[s.key] = profile.id;
      const serviceIds = CATALOGUE.filter((c) => s.categories.includes(c.name)).flatMap((c) => c.services.map(([n]) => serviceIdByName.get(n)!));
      await prisma.staffService.createMany({ data: serviceIds.map((serviceId) => ({ staffId: profile.id, serviceId })), skipDuplicates: true });
      for (let day = 0; day < 7; day++) {
        const hours = DEFAULT_HOURS[String(day) as keyof typeof DEFAULT_HOURS];
        await prisma.staffAvailability.upsert({
          where: { staffId_dayOfWeek: { staffId: profile.id, dayOfWeek: day } },
          update: {},
          create: { staffId: profile.id, dayOfWeek: day, startMinute: hours.open, endMinute: hours.close, isAvailable: day !== s.offDay },
        });
      }
    }
    console.log(`  ✓ ${STAFF.length} staff with services and weekly availability${staffPassword ? " (login enabled)" : ""}`);

    // Packages
    const packages = [
      { name: "Royal Bridal Package", price: 39999, bridal: true, image: IMG.bride2, items: ["Bridal Makeup", "Bridal Hairstyling", "Saree Draping", "Gold Facial", "Premium Manicure"], desc: "Our most-loved bridal experience: signature bridal makeup and hairstyling on the day, draping, plus a gold facial and premium manicure in the days before." },
      { name: "Pre-Bridal Glow Ritual", price: 8999, bridal: true, image: IMG.mehndi2, items: ["Hydra Facial", "Body Polishing", "Hair Spa", "Eyebrow Shaping"], desc: "A curated pre-wedding ritual to prepare your skin and hair for the big day." },
      { name: "Facial Combo", price: 3499, bridal: false, image: IMG.facialGold, items: ["Gold Facial", "De-Tan Treatment", "Eyebrow Threading"], desc: "Gold facial with de-tan and brow threading — the perfect monthly refresh." },
    ];
    for (const [i, p] of packages.entries()) {
      const pkg = await prisma.servicePackage.upsert({
        where: { slug: slug(p.name) },
        update: {},
        create: { name: p.name, slug: slug(p.name), description: p.desc, price: new Prisma.Decimal(p.price), imageUrl: unsplash(p.image, 900, 1100), isBridal: p.bridal, displayOrder: i },
      });
      await prisma.servicePackageItem.createMany({ data: p.items.map((n) => ({ packageId: pkg.id, serviceId: serviceIdByName.get(n)! })), skipDuplicates: true });
    }

    // Offers
    const offers = [
      { title: "Bridal Beauty Package", percent: 15, original: 29998, image: IMG.bride5, items: ["Bridal Makeup", "Bridal Hairstyling"], desc: "Book bridal makeup with bridal hairstyling and save 15% on your wedding-day look.", until: 90 },
      { title: "Facial Combo Offer", percent: 20, original: 3998, image: IMG.facialTreatment, items: ["Hydra Facial", "Clean-Up"], desc: "Pair our Hydra Facial with a Clean-Up for a deeply refreshed, glowing complexion.", until: 45 },
      { title: "Hair Spa Package", percent: 25, original: 2098, image: IMG.hairWash, items: ["Hair Spa", "Hair Wash and Blow Dry"], desc: "Restorative hair spa with a luxury wash and blow-dry — weekday favourite.", until: 30 },
      { title: "Festival Glow Offer", percent: 20, original: 6998, image: IMG.saree1, items: ["Party Makeup", "Saree Draping", "Gold Facial"], desc: "Get festival-ready with party makeup, saree draping and a radiant gold facial.", until: 40 },
      { title: "Seasonal Pamper Package", percent: 15, original: 3297, image: IMG.nailsPastel, items: ["Premium Manicure", "Pedicure", "Hand and Foot Care"], desc: "Seasonal hand and foot pampering — premium manicure, pedicure and paraffin care.", until: 60 },
    ];
    for (const [i, o] of offers.entries()) {
      const discounted = Math.round(o.original * (100 - o.percent)) / 100;
      const offer = await prisma.offer.upsert({
        where: { slug: slug(o.title) },
        update: {},
        create: {
          title: o.title,
          slug: slug(o.title),
          description: o.desc,
          imageUrl: unsplash(o.image, 900, 1100),
          originalPrice: new Prisma.Decimal(o.original),
          discountPercent: o.percent,
          discountedPrice: new Prisma.Decimal(discounted),
          validFrom: dateOnly(-7),
          validUntil: dateOnly(o.until),
          terms: "Valid on prior booking only. Cannot be combined with other offers.",
          displayOrder: i,
        },
      });
      await prisma.offerService.createMany({ data: o.items.map((n) => ({ offerId: offer.id, serviceId: serviceIdByName.get(n)! })), skipDuplicates: true });
    }

    // Gallery
    const gallery: Array<[string, string, string, Parameters<typeof prisma.galleryImage.create>[0]["data"]["category"], boolean?]> = [
      ["Traditional Bridal Look", "Bride in red lehenga with traditional gold jewellery", IMG.bride1, "BRIDAL_MAKEUP", true],
      ["Radiant Bride", "Smiling bride with maang tikka and soft glam makeup", IMG.bride2, "BRIDAL_MAKEUP", true],
      ["Bridal Portrait", "Bride adjusting her maang tikka in a red lehenga", IMG.bride3, "BRIDAL_MAKEUP"],
      ["Pink Bridal Glam", "Close-up of bridal eye makeup with nose ring", IMG.bride6, "BRIDAL_MAKEUP", true],
      ["Classic Red Bride", "Bride in red with floral hair accessories", IMG.bride4, "BRIDAL_MAKEUP"],
      ["Bridal Detailing", "Bride with kundan jewellery and dewy makeup", IMG.bride7, "BRIDAL_MAKEUP"],
      ["Silk Saree Styling", "Woman in silk saree with temple jewellery", IMG.saree2, "HAIRSTYLES"],
      ["Festive Elegance", "Model in purple silk saree with gajra hairstyle", IMG.saree3, "HAIRSTYLES", true],
      ["Soft Waves", "Stylist creating soft waves with a curling iron", IMG.hairWaves, "HAIRSTYLES"],
      ["Blow-Dry Bar", "Stylist blow-drying a client's hair", IMG.hairBlowDry, "HAIRSTYLES"],
      ["Signature Facial", "Client receiving a facial mask application", IMG.facialMask, "FACIAL_TREATMENTS", true],
      ["Gold Facial Ritual", "Gold facial mask massage treatment", IMG.facialGold, "FACIAL_TREATMENTS"],
      ["Skin Therapy", "Therapist performing a relaxing facial massage", IMG.facialMassage, "FACIAL_TREATMENTS"],
      ["Hydrating Treatment", "Client during a hydrating facial treatment", IMG.facialTreatment, "FACIAL_TREATMENTS"],
      ["Balayage Glow", "Long blonde balayage hair seen from behind", IMG.hairBlonde, "HAIR_TRANSFORMATIONS", true],
      ["Healthy Lengths", "Woman with long healthy brown hair", IMG.hairLong, "HAIR_TRANSFORMATIONS"],
      ["Wash & Care", "Client relaxing at the hair wash station", IMG.hairWash2, "HAIR_TRANSFORMATIONS"],
      ["Curls & Volume", "Stylist adding curls to brunette hair", IMG.hairCurl, "HAIR_TRANSFORMATIONS"],
      ["Love Nail Art", "Hand-painted red nail art with lettering", IMG.nailsArt, "NAIL_ART", true],
      ["Pastel Manicure", "Pastel and glitter manicure", IMG.nailsPastel, "NAIL_ART"],
      ["Dark Florals", "Dark nail art with floral details", IMG.nailsDark, "NAIL_ART"],
      ["Nude Elegance", "Nude almond-shaped manicure", IMG.nailsNude, "NAIL_ART"],
      ["Styling Floor", "Bright modern salon interior with styling chairs", IMG.interiorBright, "SALON_INTERIORS", true],
      ["Mirror Lounge", "Salon interior with round mirrors and black chairs", IMG.interiorMirrors, "SALON_INTERIORS"],
      ["Makeup Studio", "White makeup studio with a pink salon chair", IMG.interiorWhite, "SALON_INTERIORS"],
      ["Relaxation Corner", "Tranquil spa corner with plants", IMG.interiorSpa, "SALON_INTERIORS"],
    ];
    if ((await prisma.galleryImage.count()) === 0) {
      await prisma.galleryImage.createMany({
        data: gallery.map(([title, alt, img, category, insta], i) => ({
          title,
          altText: alt,
          imageUrl: unsplash(img, 1200),
          category,
          showOnInstagram: Boolean(insta),
          displayOrder: i,
        })),
      });
    }
    console.log("  ✓ packages, offers and gallery");

  }

  // Demo customers, bookings and reviews
  if (sampleContent) {
    await seedDemo(serviceIdByName, staffIds);
  }

  if (isProd) {
    console.warn("");
    console.warn("  ⚠ PLACEHOLDER salon details were written (address, phone, WhatsApp, email, map).");
    console.warn("    They appear on the public site and in structured data. Replace them in Admin → Settings before launch.");
    console.warn("");
  }
  console.log("🌸 Done.");
}

async function seedDemo(serviceIdByName: Map<string, string>, staffIds: Record<string, string>) {
  if ((await prisma.appointment.count()) > 0) {
    console.log("  • demo bookings already present — skipping");
    return;
  }
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD;
  const customers = [
    { name: "Riya Malhotra", email: "riya@example.test", phone: "+919811111111" },
    { name: "Aisha Khan", email: "aisha@example.test", phone: "+919822222222" },
    { name: "Divya Iyer", email: "divya@example.test", phone: "+919833333333" },
    { name: "Neha Gupta", email: "neha@example.test", phone: "+919844444444" },
    { name: "Shreya Patel", email: "shreya@example.test", phone: "+919855555555" },
  ];
  const profiles: Array<{ id: string; name: string; email: string; phone: string }> = [];
  for (const c of customers) {
    let userId: string;
    if (customerPassword) {
      userId = await upsertCredentialUser({ ...c, role: "CUSTOMER", password: customerPassword });
    } else {
      userId = (await prisma.user.findUnique({ where: { email: c.email } }))?.id ?? randomUUID();
      await prisma.user.upsert({ where: { email: c.email }, update: {}, create: { id: userId, name: c.name, email: c.email, phone: c.phone, emailVerified: true } });
    }
    const p = await prisma.customerProfile.upsert({ where: { userId }, update: {}, create: { userId } });
    profiles.push({ id: p.id, ...c });
  }

  const services = await prisma.service.findMany({ include: { staff: true } });
  const svc = (name: string) => services.find((s) => s.id === serviceIdByName.get(name))!;
  const plans: Array<[string[], string]> = [
    [["Hydra Facial"], "priya"],
    [["Gold Facial", "De-Tan Treatment"], "priya"],
    [["Haircut and Styling"], "meera"],
    [["Hair Spa"], "meera"],
    [["Hair Coloring"], "meera"],
    [["Nail Art", "Classic Manicure"], "sana"],
    [["Pedicure"], "sana"],
    [["Lash Lifting"], "sana"],
    [["Arms and Legs Waxing", "Underarm Waxing"], "kavya"],
    [["Body Polishing"], "kavya"],
    [["Party Makeup"], "ananya"],
    [["Engagement Makeup"], "ananya"],
    [["Full Face Threading", "Eyebrow Shaping"], "kavya"],
    [["Classic Facial"], "priya"],
  ];

  const reviewTexts = [
    [5, "Absolutely glowing!", "The Hydra Facial was incredible — my skin has never looked this fresh. Priya explained every step and the ambience is so calming."],
    [5, "Best haircut in years", "Meera listened to exactly what I wanted and the cut grows out beautifully. Spotless salon and lovely, warm staff."],
    [5, "Dream engagement look", "Ananya made me feel like the most beautiful version of myself. The makeup lasted the entire evening and photographed perfectly."],
    [4, "Gorgeous nail art", "Sana's attention to detail is amazing. Loved the hygiene standards and the relaxing manicure chairs."],
    [5, "So gentle and quick", "Rica waxing with Kavya was the most comfortable waxing experience I've had. Highly recommend Beauty Empire."],
    [5, "Pure relaxation", "Body polishing left my skin silky smooth. The whole experience felt luxurious from start to finish."],
  ] as const;

  let created = 0;
  let reviewIdx = 0;
  const minutes = [600, 690, 780, 870, 960, 1050];
  for (let day = -56; day <= 10; day++) {
    if (day === 0) continue;
    const perDay = day < 0 ? 1 + (Math.abs(day) % 3) : day % 2 === 0 ? 2 : 1;
    for (let k = 0; k < perDay; k++) {
      const [names, staffKey] = plans[(Math.abs(day) * 3 + k) % plans.length]!;
      const staffId = staffIds[staffKey]!;
      const lines = names.map((n, i) => ({ s: svc(n), i }));
      const duration = lines.reduce((sum, l) => sum + l.s.durationMinutes, 0);
      const start = at(day, minutes[(k * 2 + Math.abs(day)) % minutes.length]!);
      const end = new Date(start.getTime() + duration * 60_000);
      const weekday = new TZDate(start.getTime(), TZ).getDay();
      const offDay = STAFF.find((s) => s.key === staffKey)!.offDay;
      if (weekday === offDay) continue;
      const customer = profiles[(Math.abs(day) + k) % profiles.length]!;
      const subtotal = lines.reduce((sum, l) => sum.plus(l.s.discountPrice ?? l.s.price), new Prisma.Decimal(0));
      const past = day < 0;
      const status = past ? (Math.abs(day) % 11 === 0 ? "CANCELLED" : Math.abs(day) % 17 === 0 ? "NO_SHOW" : "COMPLETED") : day % 3 === 0 ? "PENDING" : "CONFIRMED";
      try {
        const appt = await prisma.appointment.create({
          data: {
            reference: reference(),
            customerId: customer.id,
            staffId,
            startAt: start,
            endAt: end,
            status,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            subtotal,
            total: subtotal,
            paymentMethod: "PAY_AT_SALON",
            paymentStatus: status === "COMPLETED" ? "PAID" : "UNPAID",
            completedAt: status === "COMPLETED" ? end : null,
            cancelledAt: status === "CANCELLED" ? start : null,
            cancelledBy: status === "CANCELLED" ? "CUSTOMER" : null,
            cancellationReason: status === "CANCELLED" ? "Change of plans" : null,
            createdAt: new Date(start.getTime() - 3 * 86_400_000),
            services: {
              create: lines.map((l) => ({ serviceId: l.s.id, serviceName: l.s.name, price: l.s.discountPrice ?? l.s.price, durationMinutes: l.s.durationMinutes, sortOrder: l.i })),
            },
            ...(status === "COMPLETED" ? { payments: { create: { method: "PAY_AT_SALON", status: "PAID", amount: subtotal, paidAt: end } } } : {}),
          },
        });
        created++;
        if (status === "COMPLETED" && reviewIdx < reviewTexts.length && day < -3 && k === 0) {
          const [rating, title, comment] = reviewTexts[reviewIdx++]!;
          await prisma.review.create({
            data: { appointmentId: appt.id, customerId: customer.id, serviceId: lines[0]!.s.id, rating, title, comment, status: "APPROVED", isFeatured: true, moderatedAt: new Date() },
          });
        }
      } catch (err) {
        // Overlap with an earlier demo booking — skip.
        if (!String(err).includes("appointment_no_staff_overlap") && !String((err as { cause?: unknown }).cause ?? "").includes("23P01")) throw err;
      }
    }
  }
  await prisma.staffLeave.create({ data: { staffId: staffIds.meera!, startDate: dateOnly(14), endDate: dateOnly(16), reason: "Hair colour masterclass" } });
  await prisma.contactMessage.create({
    data: { name: "Pooja Verma", email: "pooja@example.test", phone: "+919866666666", subject: "Bridal trial availability", message: "Hi, I'm getting married in February and would love to book a bridal trial next month. Do you have weekend availability?" },
  });
  console.log(`  ✓ ${profiles.length} demo customers, ${created} demo appointments, ${reviewIdx} approved reviews`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
