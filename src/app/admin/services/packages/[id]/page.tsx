import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { PackageForm } from "@/components/admin/simple-forms";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { toNumber } from "@/lib/utils";

export const metadata = { title: "Package" };

export default async function PackageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [pkg, services] = await Promise.all([
    isNew ? null : prisma.servicePackage.findUnique({ where: { id }, include: { items: true } }),
    prisma.service.findMany({ where: { status: "ACTIVE" }, orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }], select: { id: true, name: true, category: { select: { name: true } } } }),
  ]);
  if (!isNew && !pkg) notFound();
  return (
    <>
      <Link href="/admin/services" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-magenta">
        <ArrowLeft className="size-4" /> Services
      </Link>
      <PageHeader title={isNew ? "New package" : `Edit: ${pkg!.name}`} description="Packages are showcased on the Bridal Studio and Offers pages." />
      <PackageForm
        services={services.map((s) => ({ id: s.id, name: s.name, category: s.category.name }))}
        defaults={
          pkg
            ? { id: pkg.id, name: pkg.name, slug: pkg.slug, description: pkg.description, price: toNumber(pkg.price), imageUrl: pkg.imageUrl ?? "", isBridal: pkg.isBridal, isActive: pkg.isActive, displayOrder: pkg.displayOrder, serviceIds: pkg.items.map((i) => i.serviceId) }
            : { name: "", slug: "", description: "", price: 0, imageUrl: "", isBridal: false, isActive: true, displayOrder: 0, serviceIds: [] }
        }
      />
    </>
  );
}
