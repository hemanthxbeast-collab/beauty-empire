import Image from "next/image";
import { ImagePlus, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { GalleryDialog } from "@/components/admin/simple-forms";
import { FilterBar, SelectField } from "@/components/admin/filters";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { deleteGalleryImageAction, toggleGalleryPublishAction } from "@/server/actions/admin-catalog";
import { GALLERY_CATEGORY_LABELS, type GalleryCategoryKey } from "@/lib/constants";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireAdmin();
  const { category } = await searchParams;
  const cat = category && category in GALLERY_CATEGORY_LABELS ? (category as GalleryCategoryKey) : undefined;
  const images = await prisma.galleryImage.findMany({ where: cat ? { category: cat } : {}, orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <PageHeader
        title="Gallery"
        description="Upload, describe and publish images for the public gallery and Instagram grid."
        actions={
          <GalleryDialog
            trigger={
              <Button>
                <ImagePlus /> Add image
              </Button>
            }
          />
        }
      />
      <FilterBar action="/admin/gallery" resetHref="/admin/gallery">
        <SelectField name="category" label="Category" defaultValue={cat} options={[["", "All categories"], ...Object.entries(GALLERY_CATEGORY_LABELS)]} className="lg:w-64" />
      </FilterBar>
      {images.length === 0 ? (
        <EmptyState icon={<Images className="size-5" />} title="No images yet" description="Add your first image to start the gallery." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="relative aspect-[4/3] bg-blush">
                <Image src={img.imageUrl} alt={img.altText} fill sizes="(min-width:1280px) 22vw, 45vw" className={img.isPublished ? "object-cover" : "object-cover opacity-50 grayscale"} />
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge variant={img.isPublished ? "success" : "neutral"}>{img.isPublished ? "Published" : "Draft"}</Badge>
                  {img.showOnInstagram && <Badge>Instagram</Badge>}
                </div>
              </div>
              <div className="p-4">
                <p className="font-medium text-charcoal">{img.title}</p>
                <p className="text-xs text-muted-foreground">{GALLERY_CATEGORY_LABELS[img.category]}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <GalleryDialog
                    defaults={{ id: img.id, title: img.title, description: img.description ?? "", altText: img.altText, imageUrl: img.imageUrl, category: img.category, isPublished: img.isPublished, showOnInstagram: img.showOnInstagram, displayOrder: img.displayOrder }}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <ActionButton action={toggleGalleryPublishAction} args={{ id: img.id, isPublished: !img.isPublished }} variant="ghost">
                    {img.isPublished ? "Unpublish" : "Publish"}
                  </ActionButton>
                  <ActionButton action={deleteGalleryImageAction} args={img.id} variant="ghost" className="text-red-700" confirm={{ title: "Delete this image?", description: "It will be removed from the website.", destructive: true, confirmLabel: "Delete" }}>
                    Delete
                  </ActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
