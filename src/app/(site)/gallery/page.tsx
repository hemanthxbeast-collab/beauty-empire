import type { Metadata } from "next";
import { PageHero } from "@/components/site/section";
import { GalleryGrid } from "@/components/site/gallery-grid";
import { getGalleryImages } from "@/server/queries/public";
import { GALLERY_CATEGORY_LABELS, type GalleryCategoryKey } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Beauty Gallery",
  description: "Bridal makeup, hairstyles, facial treatments, hair transformations, nail art and our salon interiors — the Beauty Empire gallery.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const images = await getGalleryImages();
  const initial = sp.category && sp.category in GALLERY_CATEGORY_LABELS ? (sp.category as GalleryCategoryKey) : undefined;
  return (
    <>
      <PageHero
        eyebrow="Beauty Gallery"
        title={
          <>
            Artistry, <em className="text-magenta">captured</em>
          </>
        }
        description="Browse real looks and moments from our studio. Tap any image to view it full-size."
      />
      <section className="bg-white py-16 lg:py-24">
        <div className="container-lux">
          <GalleryGrid images={images} initialCategory={initial} />
        </div>
      </section>
    </>
  );
}
