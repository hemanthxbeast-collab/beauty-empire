"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GALLERY_CATEGORY_LABELS, type GalleryCategoryKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Img = { id: string; title: string; description: string | null; altText: string; imageUrl: string; category: GalleryCategoryKey };

export function GalleryGrid({ images, initialCategory }: { images: Img[]; initialCategory?: GalleryCategoryKey }) {
  const [filter, setFilter] = useState<GalleryCategoryKey | "ALL">(initialCategory ?? "ALL");
  const [index, setIndex] = useState<number | null>(null);
  const visible = useMemo(() => (filter === "ALL" ? images : images.filter((i) => i.category === filter)), [images, filter]);
  const present = useMemo(() => new Set(images.map((i) => i.category)), [images]);

  const go = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + visible.length) % visible.length)), [visible.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const current = index !== null ? visible[index] : null;

  return (
    <>
      <div role="group" aria-label="Filter gallery by category" className="flex flex-wrap gap-2">
        {(["ALL", ...Object.keys(GALLERY_CATEGORY_LABELS)] as const)
          .filter((k) => k === "ALL" || present.has(k as GalleryCategoryKey))
          .map((k) => (
            <button
              key={k}
              aria-pressed={filter === k}
              onClick={() => setFilter(k as GalleryCategoryKey | "ALL")}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[0.8rem] transition",
                filter === k ? "border-magenta bg-magenta text-white" : "border-border bg-white text-charcoal/80 hover:border-magenta hover:text-magenta",
              )}
            >
              {k === "ALL" ? "All" : GALLERY_CATEGORY_LABELS[k as GalleryCategoryKey]}
            </button>
          ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">{images.length === 0 ? "Our gallery is being prepared — new photos are coming soon." : "No images in this category yet."}</p>
      ) : (
        <motion.div layout className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          <AnimatePresence mode="popLayout">
            {visible.map((img, i) => (
              <motion.button
                layout
                key={img.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
                onClick={() => setIndex(i)}
                className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl bg-blush text-left focus-visible:ring-2 focus-visible:ring-magenta focus-visible:ring-offset-2"
                aria-label={`Open image: ${img.title}`}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.altText}
                  width={600}
                  height={i % 3 === 0 ? 780 : 600}
                  sizes="(min-width:1024px) 24vw, (min-width:768px) 32vw, 48vw"
                  className="h-auto w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute inset-x-4 bottom-4 flex items-center justify-between text-white opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="font-serif text-lg">{img.title}</span>
                  <Expand className="size-4" aria-hidden />
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <Dialog open={current !== null && current !== undefined} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent className="max-w-5xl bg-charcoal p-3 sm:p-4 [&>button]:text-white [&>button:hover]:bg-white/10 [&>button:hover]:text-white">
          {current && (
            <figure>
              <div className="relative h-[70vh] w-full">
                <Image src={current.imageUrl.replace(/w=\d+/, "w=1800")} alt={current.altText} fill sizes="90vw" className="rounded-xl object-contain" />
              </div>
              <figcaption className="flex items-center justify-between gap-4 px-2 pt-4 text-white">
                <div>
                  <DialogTitle className="text-xl text-white">{current.title}</DialogTitle>
                  <DialogDescription className="mt-1 text-white/60">
                    {current.description ?? GALLERY_CATEGORY_LABELS[current.category]} · {index! + 1} / {visible.length}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => go(-1)} className="rounded-full border border-white/20 p-2.5 hover:bg-white/10" aria-label="Previous image">
                    <ChevronLeft className="size-5" />
                  </button>
                  <button onClick={() => go(1)} className="rounded-full border border-white/20 p-2.5 hover:bg-white/10" aria-label="Next image">
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              </figcaption>
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
