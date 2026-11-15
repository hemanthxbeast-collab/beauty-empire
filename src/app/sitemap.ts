import type { MetadataRoute } from "next";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();
  const staticRoutes = ["", "/about", "/services", "/bridal", "/gallery", "/offers", "/contact", "/book", "/privacy-policy", "/terms"].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: p === "" ? ("weekly" as const) : ("monthly" as const),
    priority: p === "" ? 1 : p === "/services" || p === "/book" || p === "/bridal" ? 0.9 : 0.6,
  }));
  const services = await prisma.service.findMany({ where: { status: "ACTIVE", category: { isActive: true } }, select: { slug: true, updatedAt: true } });
  return [...staticRoutes, ...services.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 }))];
}
