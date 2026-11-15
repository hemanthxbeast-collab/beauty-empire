import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { OfferForm } from "@/components/admin/simple-forms";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { addDaysToDateKey, dateKeyInTz, dbDateToDateKey } from "@/lib/time";
import { toNumber } from "@/lib/utils";

export const metadata = { title: "Offer" };

export default async function OfferEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [offer, services, settings] = await Promise.all([
    isNew ? null : prisma.offer.findUnique({ where: { id }, include: { services: true } }),
    prisma.service.findMany({ where: { status: "ACTIVE" }, orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }], select: { id: true, name: true, category: { select: { name: true } } } }),
    getSalonSettings(),
  ]);
  if (!isNew && !offer) notFound();
  const today = dateKeyInTz(new Date(), settings.timezone);
  return (
    <>
      <Link href="/admin/offers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> Offers
      </Link>
      <PageHeader title={isNew ? "New offer" : `Edit: ${offer!.title}`} />
      <OfferForm
        services={services.map((s) => ({ id: s.id, name: s.name, category: s.category.name }))}
        defaults={
          offer
            ? {
                id: offer.id,
                title: offer.title,
                slug: offer.slug,
                description: offer.description,
                imageUrl: offer.imageUrl ?? "",
                originalPrice: toNumber(offer.originalPrice),
                discountPercent: offer.discountPercent,
                validFrom: dbDateToDateKey(offer.validFrom),
                validUntil: dbDateToDateKey(offer.validUntil),
                isActive: offer.isActive,
                terms: offer.terms ?? "",
                displayOrder: offer.displayOrder,
                serviceIds: offer.services.map((s) => s.serviceId),
              }
            : { title: "", slug: "", description: "", imageUrl: "", originalPrice: 0, discountPercent: 10, validFrom: today, validUntil: addDaysToDateKey(today, 30), isActive: true, terms: "", displayOrder: 0, serviceIds: [] }
        }
      />
    </>
  );
}
