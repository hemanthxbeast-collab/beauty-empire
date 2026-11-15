import "server-only";
import { prisma } from "@/server/db";
import { toNumber } from "@/lib/utils";
import { dateKeyInTz, dateKeyToDbDate } from "@/lib/time";
import type { GalleryCategory, Prisma } from "@/generated/prisma/client";

const serviceCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  price: true,
  discountPrice: true,
  durationMinutes: true,
  imageUrl: true,
  isFeatured: true,
  isBridal: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ServiceSelect;

export type ServiceCardData = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  price: number;
  discountPrice: number | null;
  durationMinutes: number;
  imageUrl: string | null;
  isFeatured: boolean;
  isBridal: boolean;
  category: { name: string; slug: string };
};

function toCard(s: Prisma.ServiceGetPayload<{ select: typeof serviceCardSelect }>): ServiceCardData {
  return { ...s, price: toNumber(s.price), discountPrice: s.discountPrice ? toNumber(s.discountPrice) : null };
}

const activeService = { status: "ACTIVE", category: { isActive: true } } satisfies Prisma.ServiceWhereInput;

export async function getCategories() {
  return prisma.serviceCategory.findMany({
    where: { isActive: true, services: { some: { status: "ACTIVE" } } },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, slug: true, description: true, imageUrl: true, _count: { select: { services: { where: { status: "ACTIVE" } } } } },
  });
}

export async function getFeaturedServices(limit = 8) {
  const services = await prisma.service.findMany({
    where: { ...activeService, isFeatured: true },
    orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
    take: limit,
    select: serviceCardSelect,
  });
  return services.map(toCard);
}

export type ServiceSort = "featured" | "price-asc" | "price-desc" | "duration" | "name";

export async function searchServices(params: { q?: string; category?: string; sort?: ServiceSort }) {
  const q = params.q?.trim().slice(0, 80);
  const orderBy: Prisma.ServiceOrderByWithRelationInput[] =
    params.sort === "price-asc"
      ? [{ price: "asc" }]
      : params.sort === "price-desc"
        ? [{ price: "desc" }]
        : params.sort === "duration"
          ? [{ durationMinutes: "asc" }]
          : params.sort === "name"
            ? [{ name: "asc" }]
            : [{ category: { displayOrder: "asc" } }, { isFeatured: "desc" }, { displayOrder: "asc" }];
  const services = await prisma.service.findMany({
    where: {
      ...activeService,
      ...(params.category ? { category: { slug: params.category, isActive: true } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { shortDescription: { contains: q, mode: "insensitive" } },
              { category: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy,
    select: serviceCardSelect,
  });
  return services.map(toCard);
}

export async function getServiceBySlug(slug: string) {
  const s = await prisma.service.findFirst({
    where: { slug, ...activeService },
    select: {
      ...serviceCardSelect,
      description: true,
      categoryId: true,
      staff: {
        where: { staff: { isBookable: true, user: { isActive: true } } },
        select: { staff: { select: { id: true, title: true, photoUrl: true, specialties: true, user: { select: { name: true } } } } },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, rating: true, title: true, comment: true, createdAt: true, customer: { select: { user: { select: { name: true } } } } },
      },
    },
  });
  if (!s) return null;
  const related = await prisma.service.findMany({
    where: { ...activeService, categoryId: s.categoryId, id: { not: s.id } },
    orderBy: { displayOrder: "asc" },
    take: 3,
    select: serviceCardSelect,
  });
  return { ...toCard(s), description: s.description, staff: s.staff.map((x) => x.staff), reviews: s.reviews, related: related.map(toCard) };
}

export async function getBridalServices() {
  const services = await prisma.service.findMany({ where: { ...activeService, isBridal: true }, orderBy: { displayOrder: "asc" }, select: serviceCardSelect });
  return services.map(toCard);
}

export async function getPackages(opts: { bridal?: boolean } = {}) {
  const packages = await prisma.servicePackage.findMany({
    where: { isActive: true, ...(opts.bridal !== undefined ? { isBridal: opts.bridal } : {}) },
    orderBy: { displayOrder: "asc" },
    include: { items: { include: { service: { select: { id: true, name: true, price: true, discountPrice: true, status: true } } } } },
  });
  return packages.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    imageUrl: p.imageUrl,
    isBridal: p.isBridal,
    price: toNumber(p.price),
    worth: p.items.reduce((sum, i) => sum + toNumber(i.service.discountPrice ?? i.service.price), 0),
    services: p.items.filter((i) => i.service.status === "ACTIVE").map((i) => ({ id: i.service.id, name: i.service.name })),
  }));
}

export async function getActiveOffers(timeZone = "Asia/Kolkata") {
  const today = dateKeyToDbDate(dateKeyInTz(new Date(), timeZone));
  const offers = await prisma.offer.findMany({
    where: { isActive: true, validFrom: { lte: today }, validUntil: { gte: today } },
    orderBy: [{ displayOrder: "asc" }, { validUntil: "asc" }],
    include: { services: { where: { service: { status: "ACTIVE" } }, select: { service: { select: { id: true, name: true } } } } },
  });
  return offers.map((o) => ({
    id: o.id,
    title: o.title,
    slug: o.slug,
    description: o.description,
    imageUrl: o.imageUrl,
    originalPrice: toNumber(o.originalPrice),
    discountedPrice: toNumber(o.discountedPrice),
    discountPercent: o.discountPercent,
    validUntil: o.validUntil,
    terms: o.terms,
    services: o.services.map((s) => s.service),
  }));
}
export type OfferCardData = Awaited<ReturnType<typeof getActiveOffers>>[number];

export async function getApprovedReviews(limit = 9) {
  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      service: { select: { name: true } },
      customer: { select: { user: { select: { name: true, image: true } } } },
    },
  });
  return reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    serviceName: r.service?.name ?? null,
    // Show first name + last initial only (privacy)
    customerName: (() => {
      const parts = r.customer.user.name.trim().split(/\s+/);
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : parts[0]!;
    })(),
  }));
}

export async function getReviewStats() {
  const agg = await prisma.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  return { average: agg._avg.rating ?? 0, count: agg._count._all };
}

export async function getGalleryImages(category?: GalleryCategory) {
  return prisma.galleryImage.findMany({
    where: { isPublished: true, ...(category ? { category } : {}) },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, description: true, altText: true, imageUrl: true, category: true },
  });
}

export async function getInstagramImages(limit = 6) {
  return prisma.galleryImage.findMany({
    where: { isPublished: true, showOnInstagram: true },
    orderBy: { displayOrder: "asc" },
    take: limit,
    select: { id: true, altText: true, imageUrl: true },
  });
}

export async function getPublicStaff() {
  return prisma.staffProfile.findMany({
    where: { isBookable: true, user: { isActive: true, role: "STAFF" } },
    orderBy: { displayOrder: "asc" },
    select: { id: true, slug: true, title: true, bio: true, photoUrl: true, specialties: true, yearsOfExperience: true, user: { select: { name: true } } },
  });
}
