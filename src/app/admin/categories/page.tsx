import Image from "next/image";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { CategoryDialog } from "@/components/admin/simple-forms";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { deleteCategoryAction } from "@/server/actions/admin-catalog";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await prisma.serviceCategory.findMany({ orderBy: { displayOrder: "asc" }, include: { _count: { select: { services: true } } } });
  return (
    <>
      <PageHeader
        title="Service categories"
        description="Organise services on the website and in the booking flow."
        actions={
          <CategoryDialog
            trigger={
              <Button>
                <Plus /> New category
              </Button>
            }
          />
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>Category</TH>
            <TH>Slug</TH>
            <TH>Services</TH>
            <TH>Order</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {categories.map((c) => (
            <TR key={c.id}>
              <TD>
                <div className="flex items-center gap-3">
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-blush">{c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="40px" className="object-cover" />}</span>
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="line-clamp-1 max-w-80 text-xs text-muted-foreground">{c.description}</span>
                  </span>
                </div>
              </TD>
              <TD className="font-mono text-xs">{c.slug}</TD>
              <TD>{c._count.services}</TD>
              <TD>{c.displayOrder}</TD>
              <TD>
                <Badge variant={c.isActive ? "success" : "neutral"}>{c.isActive ? "Active" : "Hidden"}</Badge>
              </TD>
              <TD>
                <div className="flex justify-end gap-1">
                  <CategoryDialog
                    defaults={{ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", imageUrl: c.imageUrl ?? "", displayOrder: c.displayOrder, isActive: c.isActive }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <ActionButton action={deleteCategoryAction} args={c.id} variant="ghost" className="text-red-700" confirm={{ title: `Delete “${c.name}”?`, description: "Only empty categories can be deleted.", destructive: true, confirmLabel: "Delete" }}>
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
