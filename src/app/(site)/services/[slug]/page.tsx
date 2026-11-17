import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard, Stars } from "@/components/site/cards";
import { WhatsappIcon } from "@/components/site/icons";
import { Reveal } from "@/components/site/motion";
import { getServiceBySlug } from "@/server/queries/public";
import { getSalonSettings } from "@/server/services/settings";
import { absoluteUrl, formatDuration, formatINR, initials } from "@/lib/utils";
import { bookingEnquiryMessage, whatsappLink } from "@/lib/whatsapp";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getServiceBySlug(slug);
  if (!s) return { title: "Service not found" };
  return {
    title: `${s.name} — ${s.category.name}`,
    description: s.shortDescription,
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: { title: s.name, description: s.shortDescription, images: s.imageUrl ? [{ url: s.imageUrl }] : undefined },
  };
}

export default async function ServiceDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [s, settings] = await Promise.all([getServiceBySlug(slug), getSalonSettings()]);
  if (!s) notFound();
  const price = s.discountPrice ?? s.price;
  const paragraphs = s.description.split(/\n{2,}/).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.shortDescription,
    serviceType: s.category.name,
    provider: { "@type": "BeautySalon", name: settings.salonName, url: absoluteUrl("/") },
    offers: { "@type": "Offer", price: price.toFixed(2), priceCurrency: "INR", url: absoluteUrl(`/services/${s.slug}`) },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="bg-ivory">
        <div className="container-lux py-10 lg:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link href="/services" className="inline-flex items-center gap-1.5 hover:text-magenta">
              <ArrowLeft className="size-4" aria-hidden /> All services
            </Link>
            <span className="mx-2" aria-hidden>
              /
            </span>
            <Link href={`/services?category=${s.category.slug}`} className="hover:text-magenta">
              {s.category.name}
            </Link>
          </nav>
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-t-[10rem] rounded-b-3xl bg-blush shadow-lift">
              {s.imageUrl && <Image src={s.imageUrl} alt={s.name} fill priority sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />}
            </Reveal>
            <Reveal delay={0.1} className="flex flex-col justify-center">
              <p className="eyebrow">{s.category.name}</p>
              <h1 className="heading-xl mt-4 !text-5xl sm:!text-6xl">{s.name}</h1>
              <p className="lead mt-5">{s.shortDescription}</p>
              <dl className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-white p-5">
                  <dt className="text-[0.65rem] tracking-[0.18em] text-muted-rose uppercase">Starting at</dt>
                  <dd className="mt-1 font-serif text-3xl text-charcoal">
                    {formatINR(price)}
                    {s.discountPrice && <s className="ml-2 font-sans text-sm text-muted-foreground">{formatINR(s.price)}</s>}
                  </dd>
                </div>
                <div className="rounded-2xl border border-border bg-white p-5">
                  <dt className="text-[0.65rem] tracking-[0.18em] text-muted-rose uppercase">Duration</dt>
                  <dd className="mt-1 flex items-center gap-2 font-serif text-3xl text-charcoal">
                    <Clock className="size-5 text-magenta" aria-hidden />
                    {formatDuration(s.durationMinutes)}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={`/book?service=${s.id}`}>
                    <CalendarCheck /> Book Now
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={whatsappLink(settings.whatsappNumber, bookingEnquiryMessage(s.name))} target="_blank" rel="noopener noreferrer">
                    <WhatsappIcon className="size-4 text-whatsapp" /> Enquire on WhatsApp
                  </a>
                </Button>
              </div>
              <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-magenta" aria-hidden /> Sterilised tools &amp; single-use consumables
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="size-4 text-magenta" aria-hidden /> Premium, salon-grade products
                </li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-lux grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="heading-md">About this service</h2>
            <div className="prose-lux mt-6 max-w-2xl">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {s.reviews.length > 0 && (
              <div className="mt-14">
                <h2 className="heading-md">What guests say</h2>
                <ul className="mt-6 space-y-5">
                  {s.reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-border p-6">
                      <Stars rating={r.rating} />
                      {r.title && <p className="mt-3 font-serif text-lg text-charcoal">{r.title}</p>}
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                      <p className="mt-3 text-xs text-muted-rose">— {r.customer.user.name.split(" ")[0]}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {s.staff.length > 0 && (
            <aside aria-labelledby="specialists">
              <h2 id="specialists" className="heading-md">
                Your specialists
              </h2>
              <ul className="mt-6 space-y-4">
                {s.staff.map((st) => (
                  <li key={st.id} className="flex items-center gap-4 rounded-2xl border border-border p-4">
                    {st.photoUrl ? (
                      <Image src={st.photoUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-full bg-blush font-serif text-lg text-magenta-deep">{initials(st.user.name)}</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-charcoal">{st.user.name}</p>
                      <p className="text-xs text-muted-foreground">{st.title}</p>
                    </div>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/book?service=${s.id}&staff=${st.id}`} aria-label={`Book ${s.name} with ${st.user.name}`}>
                        Book
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>

      {s.related.length > 0 && (
        <section className="bg-ivory py-16 lg:py-24">
          <div className="container-lux">
            <h2 className="heading-md">You may also love</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {s.related.map((r) => (
                <ServiceCard key={r.id} service={r} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
