import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { PageHero } from "@/components/site/section";
import { ServiceCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { getCategories, searchServices, type ServiceSort } from "@/server/queries/public";
import { IMG, unsplash } from "@/lib/images";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Services & Prices",
  description: "Facials, hair, bridal makeup, threading, waxing, manicure, pedicure, lashes and more — explore Beauty Empire's services with transparent pricing.",
  alternates: { canonical: "/services" },
};

const SORTS: Array<{ value: ServiceSort; label: string }> = [
  { value: "featured", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "duration", label: "Duration" },
  { value: "name", label: "Name (A–Z)" },
];

type SP = Promise<{ q?: string; category?: string; sort?: string }>;

export default async function ServicesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "featured") as ServiceSort;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === sp.category)?.slug;
  const services = await searchServices({ q, category, sort });

  const href = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q: q || undefined, category, sort: sort === "featured" ? undefined : sort, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/services?${s}` : "/services";
  };

  return (
    <>
      <PageHero
        eyebrow="Our Services"
        title={
          <>
            Beauty, <em className="text-magenta">tailored</em> to you
          </>
        }
        description="Transparent starting prices, approximate durations and a personal consultation with every service."
        image={unsplash(IMG.hairStyling, 900)}
      />
      <section className="bg-white py-16 lg:py-24">
        <div className="container-lux">
          <form action="/services" method="get" role="search" className="flex flex-col gap-3 rounded-2xl border border-border bg-ivory p-3 sm:flex-row sm:items-center">
            {category && <input type="hidden" name="category" value={category} />}
            <label className="relative flex-1">
              <span className="sr-only">Search services</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-rose" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search facials, hair spa, bridal…"
                className="h-12 w-full rounded-xl border border-input bg-white pr-4 pl-11 text-sm focus-visible:border-magenta focus-visible:ring-4 focus-visible:ring-magenta/10 focus-visible:outline-none"
              />
            </label>
            <label className="relative sm:w-56">
              <span className="sr-only">Sort by</span>
              <SlidersHorizontal aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-rose" />
              <select
                name="sort"
                defaultValue={sort}
                className="h-12 w-full appearance-none rounded-xl border border-input bg-white pr-4 pl-11 text-sm focus-visible:border-magenta focus-visible:outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" className="h-12">
              Search
            </Button>
          </form>

          <nav aria-label="Service categories" className="mt-8 flex gap-2 overflow-x-auto pb-2">
            <Link
              href={href({ category: undefined })}
              aria-current={!category ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[0.8rem] transition",
                !category ? "border-magenta bg-magenta text-white" : "border-border bg-white text-charcoal/80 hover:border-magenta hover:text-magenta",
              )}
            >
              All services
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={href({ category: c.slug })}
                aria-current={category === c.slug ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-[0.8rem] transition",
                  category === c.slug ? "border-magenta bg-magenta text-white" : "border-border bg-white text-charcoal/80 hover:border-magenta hover:text-magenta",
                )}
              >
                {c.name} <span className="opacity-60">({c._count.services})</span>
              </Link>
            ))}
          </nav>

          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {services.length} {services.length === 1 ? "service" : "services"}
            {q && (
              <>
                {" "}
                matching “<span className="text-charcoal">{q}</span>”
              </>
            )}
          </p>

          {services.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={<Search className="size-5" />}
                title="No services found"
                description="Try a different search term or browse all categories."
                action={
                  <Button asChild variant="outline">
                    <Link href="/services">Clear filters</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {services.map((s, i) => (
                <Reveal key={s.id} delay={Math.min(i, 7) * 0.04}>
                  <ServiceCard service={s} priority={i < 4} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
