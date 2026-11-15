import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { ServiceForm } from "@/components/admin/service-form";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { toNumber } from "@/lib/utils";

export const metadata = { title: "Edit service" };

/** Handles both /admin/services/new and /admin/services/[id]. */
export default async function ServiceEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [service, categories, staff] = await Promise.all([
    isNew ? null : prisma.service.findUnique({ where: { id }, include: { staff: { select: { staffId: true } } } }),
    prisma.serviceCategory.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    prisma.staffProfile.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, title: true, user: { select: { name: true } } } }),
  ]);
  if (!isNew && !service) notFound();

  return (
    <>
      <Link href="/admin/services" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> Services
      </Link>
      <PageHeader title={isNew ? "New service" : `Edit: ${service!.name}`} />
      <ServiceForm
        categories={categories}
        staff={staff.map((s) => ({ id: s.id, name: s.user.name, title: s.title }))}
        defaults={
          service
            ? {
                id: service.id,
                categoryId: service.categoryId,
                name: service.name,
                slug: service.slug,
                shortDescription: service.shortDescription,
                description: service.description,
                price: toNumber(service.price),
                discountPrice: service.discountPrice ? toNumber(service.discountPrice) : undefined,
                durationMinutes: service.durationMinutes,
                imageUrl: service.imageUrl ?? "",
                status: service.status,
                isFeatured: service.isFeatured,
                isBridal: service.isBridal,
                displayOrder: service.displayOrder,
                staffIds: service.staff.map((s) => s.staffId),
              }
            : {
                categoryId: categories[0]?.id ?? "",
                name: "",
                slug: "",
                shortDescription: "",
                description: "",
                price: 0,
                discountPrice: undefined,
                durationMinutes: 60,
                imageUrl: "",
                status: "ACTIVE",
                isFeatured: false,
                isBridal: false,
                displayOrder: 0,
                staffIds: [],
              }
        }
      />
    </>
  );
}
