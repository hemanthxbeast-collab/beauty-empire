import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { PageHero } from "@/components/site/section";
import { OfferCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/motion";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { getActiveOffers, getPackages } from "@/server/queries/public";
import { getSalonSettings } from "@/server/services/settings";
import { IMG, unsplash } from "@/lib/images";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Special Offers & Packages",
  description: "Bridal packages, facial combos, hair spa packages and seasonal beauty offers at Beauty Empire.",
  alternates: { canonical: "/offers" },
};

export default async function OffersPage() {
  const settings = await getSalonSettings();
  const [offers, packages] = await Promise.all([getActiveOffers(settings.timezone), getPackages({ bridal: false })]);
  return (
    <>
      <PageHero
        eyebrow="Special Offers"
        title={
          <>
            Indulge for <em className="text-magenta">less</em>
          </>
        }
        description="Limited-time offers and curated packages. Discounts are applied automatically when you book through the offer."
        image={unsplash(IMG.nailsPastel, 900)}
      />
      <section className="bg-white py-16 lg:py-24">
        <div className="container-lux">
          {offers.length === 0 ? (
            <EmptyState
              icon={<Tag className="size-5" />}
              title="No active offers right now"
              description="New seasonal offers are added regularly — check back soon or follow us on Instagram."
              action={
                <Button asChild>
                  <Link href="/services">Browse services</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((o, i) => (
                <Reveal key={o.id} delay={(i % 3) * 0.06}>
                  <OfferCard offer={o} />
                </Reveal>
              ))}
            </div>
          )}

          {packages.length > 0 && (
            <div className="mt-24">
              <h2 className="heading-md">Service packages</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((p) => (
                  <article key={p.id} className="flex flex-col rounded-2xl border border-border bg-ivory/50 p-7">
                    <h3 className="font-serif text-2xl text-charcoal">{p.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                    <p className="mt-4 text-xs text-muted-rose">{p.services.map((s) => s.name).join(" · ")}</p>
                    <p className="mt-auto pt-6">
                      <span className="font-serif text-3xl text-magenta">{formatINR(p.price)}</span>
                      {p.worth > p.price && <s className="ml-2 text-sm text-muted-foreground">{formatINR(p.worth)}</s>}
                    </p>
                    <Button asChild variant="outline" className="mt-5">
                      <Link href={`/book?${p.services.map((s) => `service=${s.id}`).join("&")}`}>Book these services</Link>
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
