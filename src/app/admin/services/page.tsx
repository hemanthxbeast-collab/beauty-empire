import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { FilterBar, SearchField, SelectField } from "@/components/admin/filters";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { deletePackageAction, deleteServiceAction, setServiceStatusAction } from "@/server/actions/admin-catalog";
import { formatDuration, formatINR } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Services" };

export default async function AdminServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const where: Prisma.ServiceWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.status === "ACTIVE" || sp.status === "INACTIVE" ? { status: sp.status } : {}),
  };
  const [services, categories, packages] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ category: { displayOrder: "asc" } }, { displayOrder: "asc" }],
      include: { category: { select: { name: true } }, _count: { select: { appointmentServices: true, staff: true } } },
    }),
    prisma.serviceCategory.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    prisma.servicePackage.findMany({ orderBy: { displayOrder: "asc" }, include: { items: { include: { service: { select: { name: true } } } } } }),
  ]);

  return (
    <>
      <PageHeader
        title="Services"
        description={`${services.length} services · changes appear on the website immediately`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/services/packages/new">
                <Plus /> New package
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/services/new">
                <Plus /> New service
              </Link>
            </Button>
          </>
        }
      />
      <FilterBar action="/admin/services" resetHref="/admin/services">
        <SearchField defaultValue={q} placeholder="Search services" />
        <SelectField name="category" label="Category" defaultValue={sp.category} options={[["", "All categories"], ...categories.map((c) => [c.id, c.name] as [string, string])]} />
        <SelectField name="status" label="Status" defaultValue={sp.status} options={[["", "Any status"], ["ACTIVE", "Active"], ["INACTIVE", "Inactive"]]} />
      </FilterBar>
      <Table>
        <THead>
          <TR>
            <TH>Service</TH>
            <TH>Category</TH>
            <TH>Price</TH>
            <TH>Duration</TH>
            <TH>Status</TH>
            <TH>Bookings</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {services.map((s) => (
            <TR key={s.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-blush">{s.imageUrl && <Image src={s.imageUrl} alt="" fill sizes="44px" className="object-cover" />}</span>
                  <span>
                    <Link href={`/admin/services/${s.id}`} className="font-medium text-charcoal hover:text-magenta">
                      {s.name}
                    </Link>
                    <span className="mt-0.5 flex gap-1">
                      {s.isFeatured && <Badge>Featured</Badge>}
                      {s.isBridal && <Badge variant="outline">Bridal</Badge>}
                    </span>
                  </span>
                </div>
              </TD>
              <TD>{s.category.name}</TD>
              <TD className="whitespace-nowrap">
                {formatINR(s.discountPrice ?? s.price)}
                {s.discountPrice && <s className="ml-1 text-xs text-muted-foreground">{formatINR(s.price)}</s>}
              </TD>
              <TD className="whitespace-nowrap">{formatDuration(s.durationMinutes)}</TD>
              <TD>
                <Badge variant={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
              </TD>
              <TD>{s._count.appointmentServices}</TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/services/${s.id}`}>Edit</Link>
                  </Button>
                  <ActionButton action={setServiceStatusAction} args={{ id: s.id, status: s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }} variant="ghost">
                    {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </ActionButton>
                  <ActionButton
                    action={deleteServiceAction}
                    args={s.id}
                    variant="ghost"
                    className="text-red-700"
                    confirm={{ title: `Delete “${s.name}”?`, description: "Services with booking history are deactivated instead, so past bookings stay intact.", destructive: true, confirmLabel: "Delete" }}
                  >
                    Delete
                  </ActionButton>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <h2 className="mt-12 mb-4 font-serif text-2xl text-charcoal">Service packages</h2>
      <Table>
        <THead>
          <TR>
            <TH>Package</TH>
            <TH>Includes</TH>
            <TH>Price</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {packages.map((p) => (
            <TR key={p.id}>
              <TD className="font-medium">{p.name}</TD>
              <TD className="max-w-80 text-xs text-muted-foreground">{p.items.map((i) => i.service.name).join(", ")}</TD>
              <TD>{formatINR(p.price)}</TD>
              <TD>
                <Badge variant={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Hidden"}</Badge>
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/services/packages/${p.id}`}>Edit</Link>
                  </Button>
                  <ActionButton action={deletePackageAction} args={p.id} variant="ghost" className="text-red-700" confirm={{ title: `Delete “${p.name}”?`, destructive: true, confirmLabel: "Delete" }}>
                    Delete
                  </ActionButton>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </>
  );
}
