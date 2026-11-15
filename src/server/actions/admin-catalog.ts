"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { AppError, toActionError, type ActionResult } from "@/server/errors";
import { audit } from "@/server/services/audit";
import { categorySchema, galleryImageSchema, offerSchema, packageSchema, serviceSchema } from "@/lib/validations/admin";
import { idSchema } from "@/lib/validations/booking";
import { dateKeyToDbDate } from "@/lib/time";
import { slugify } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";
import type { z } from "zod";

function fieldError<T>(parsed: z.ZodSafeParseError<T>): ActionResult<never> {
  return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form.", fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
}

function uniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function refreshPublic() {
  revalidatePath("/", "layout");
}

// ───────────────────────── Categories ─────────────────────────

export async function saveCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fieldError(parsed);
  try {
    const admin = await requireAdmin();
    const { id, ...d } = parsed.data;
    const data = { ...d, slug: d.slug || slugify(d.name), description: d.description || null, imageUrl: d.imageUrl ?? null };
    const cat = id ? await prisma.serviceCategory.update({ where: { id }, data }) : await prisma.serviceCategory.create({ data });
    await audit({ actorId: admin.id, action: id ? "category.update" : "category.create", entityType: "ServiceCategory", entityId: cat.id });
    refreshPublic();
    return { ok: true, data: { id: cat.id }, message: "Category saved." };
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "A category with this name or slug already exists." };
    return toActionError(err);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(id);
    const count = await prisma.service.count({ where: { categoryId: id } });
    if (count > 0) throw new AppError("Move or delete the services in this category first (or deactivate the category).", "CONFLICT");
    await prisma.serviceCategory.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "category.delete", entityType: "ServiceCategory", entityId: id });
    refreshPublic();
    return { ok: true, data: undefined, message: "Category deleted." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Services ─────────────────────────

export async function saveServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fieldError(parsed);
  try {
    const admin = await requireAdmin();
    const { id, staffIds, ...d } = parsed.data;
    const data = {
      ...d,
      slug: d.slug || slugify(d.name),
      price: new Prisma.Decimal(d.price),
      discountPrice: d.discountPrice !== undefined ? new Prisma.Decimal(d.discountPrice) : null,
      imageUrl: d.imageUrl ?? null,
    };
    const service = await prisma.$transaction(async (tx) => {
      const s = id ? await tx.service.update({ where: { id }, data }) : await tx.service.create({ data });
      await tx.staffService.deleteMany({ where: { serviceId: s.id } });
      if (staffIds.length) await tx.staffService.createMany({ data: [...new Set(staffIds)].map((staffId) => ({ staffId, serviceId: s.id })) });
      await audit({ tx, actorId: admin.id, action: id ? "service.update" : "service.create", entityType: "Service", entityId: s.id, metadata: { name: s.name, price: d.price } });
      return s;
    });
    refreshPublic();
    return { ok: true, data: { id: service.id }, message: id ? "Service updated." : "Service created." };
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "A service with this slug already exists.", fieldErrors: { slug: ["Slug already in use"] } };
    return toActionError(err);
  }
}

export async function setServiceStatusAction(args: { id: string; status: "ACTIVE" | "INACTIVE" }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(args.id);
    await prisma.service.update({ where: { id: args.id }, data: { status: args.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" } });
    await audit({ actorId: admin.id, action: `service.${args.status.toLowerCase()}`, entityType: "Service", entityId: args.id });
    refreshPublic();
    return { ok: true, data: undefined, message: args.status === "ACTIVE" ? "Service activated." : "Service deactivated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(id);
    const used = await prisma.appointmentService.count({ where: { serviceId: id } });
    if (used > 0) {
      await prisma.service.update({ where: { id }, data: { status: "INACTIVE" } });
      await audit({ actorId: admin.id, action: "service.deactivate", entityType: "Service", entityId: id, metadata: { reason: "has bookings" } });
      refreshPublic();
      return { ok: true, data: undefined, message: "This service has booking history, so it was deactivated instead of deleted." };
    }
    await prisma.$transaction([prisma.servicePackageItem.deleteMany({ where: { serviceId: id } }), prisma.service.delete({ where: { id } })]);
    await audit({ actorId: admin.id, action: "service.delete", entityType: "Service", entityId: id });
    refreshPublic();
    return { ok: true, data: undefined, message: "Service deleted." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Packages ─────────────────────────

export async function savePackageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return fieldError(parsed);
  try {
    const admin = await requireAdmin();
    const { id, serviceIds, ...d } = parsed.data;
    const data = { ...d, slug: d.slug || slugify(d.name), price: new Prisma.Decimal(d.price), imageUrl: d.imageUrl ?? null };
    const pkg = await prisma.$transaction(async (tx) => {
      const p = id ? await tx.servicePackage.update({ where: { id }, data }) : await tx.servicePackage.create({ data });
      await tx.servicePackageItem.deleteMany({ where: { packageId: p.id } });
      await tx.servicePackageItem.createMany({ data: [...new Set(serviceIds)].map((serviceId) => ({ packageId: p.id, serviceId })) });
      return p;
    });
    await audit({ actorId: admin.id, action: id ? "package.update" : "package.create", entityType: "ServicePackage", entityId: pkg.id });
    refreshPublic();
    return { ok: true, data: { id: pkg.id }, message: "Package saved." };
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "A package with this slug already exists." };
    return toActionError(err);
  }
}

export async function deletePackageAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(id);
    await prisma.servicePackage.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "package.delete", entityType: "ServicePackage", entityId: id });
    refreshPublic();
    return { ok: true, data: undefined, message: "Package deleted." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Offers ─────────────────────────

export async function saveOfferAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return fieldError(parsed);
  try {
    const admin = await requireAdmin();
    const { id, serviceIds, ...d } = parsed.data;
    const discounted = Math.round(d.originalPrice * (100 - d.discountPercent)) / 100;
    const data = {
      ...d,
      slug: d.slug || slugify(d.title),
      imageUrl: d.imageUrl ?? null,
      terms: d.terms || null,
      originalPrice: new Prisma.Decimal(d.originalPrice),
      discountedPrice: new Prisma.Decimal(discounted),
      validFrom: dateKeyToDbDate(d.validFrom),
      validUntil: dateKeyToDbDate(d.validUntil),
    };
    const offer = await prisma.$transaction(async (tx) => {
      const o = id ? await tx.offer.update({ where: { id }, data }) : await tx.offer.create({ data });
      await tx.offerService.deleteMany({ where: { offerId: o.id } });
      if (serviceIds.length) await tx.offerService.createMany({ data: [...new Set(serviceIds)].map((serviceId) => ({ offerId: o.id, serviceId })) });
      return o;
    });
    await audit({ actorId: admin.id, action: id ? "offer.update" : "offer.create", entityType: "Offer", entityId: offer.id, metadata: { discountPercent: d.discountPercent } });
    refreshPublic();
    return { ok: true, data: { id: offer.id }, message: "Offer saved." };
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "An offer with this slug already exists." };
    return toActionError(err);
  }
}

export async function toggleOfferAction(args: { id: string; isActive: boolean }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(args.id);
    await prisma.offer.update({ where: { id: args.id }, data: { isActive: Boolean(args.isActive) } });
    await audit({ actorId: admin.id, action: args.isActive ? "offer.activate" : "offer.deactivate", entityType: "Offer", entityId: args.id });
    refreshPublic();
    return { ok: true, data: undefined, message: args.isActive ? "Offer activated." : "Offer deactivated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteOfferAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(id);
    await prisma.offer.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "offer.delete", entityType: "Offer", entityId: id });
    refreshPublic();
    return { ok: true, data: undefined, message: "Offer deleted." };
  } catch (err) {
    return toActionError(err);
  }
}

// ───────────────────────── Gallery ─────────────────────────

export async function saveGalleryImageAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = galleryImageSchema.safeParse(input);
  if (!parsed.success) return fieldError(parsed);
  try {
    const admin = await requireAdmin();
    const { id, ...d } = parsed.data;
    const data = { ...d, description: d.description || null };
    const img = id ? await prisma.galleryImage.update({ where: { id }, data }) : await prisma.galleryImage.create({ data });
    await audit({ actorId: admin.id, action: id ? "gallery.update" : "gallery.create", entityType: "GalleryImage", entityId: img.id });
    refreshPublic();
    return { ok: true, data: { id: img.id }, message: "Image saved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function toggleGalleryPublishAction(args: { id: string; isPublished: boolean }): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(args.id);
    await prisma.galleryImage.update({ where: { id: args.id }, data: { isPublished: Boolean(args.isPublished) } });
    await audit({ actorId: admin.id, action: args.isPublished ? "gallery.publish" : "gallery.unpublish", entityType: "GalleryImage", entityId: args.id });
    refreshPublic();
    return { ok: true, data: undefined, message: args.isPublished ? "Image published." : "Image unpublished." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteGalleryImageAction(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    idSchema.parse(id);
    await prisma.galleryImage.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "gallery.delete", entityType: "GalleryImage", entityId: id });
    refreshPublic();
    return { ok: true, data: undefined, message: "Image deleted." };
  } catch (err) {
    return toActionError(err);
  }
}
