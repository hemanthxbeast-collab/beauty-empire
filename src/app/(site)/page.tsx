import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeIndianRupee,
  Flower2,
  Gem,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, Reveal } from "@/components/site/motion";
import { SectionHeading } from "@/components/site/section";
import { OfferCard, ServiceCard, TestimonialCard } from "@/components/site/cards";
import { InstagramIcon } from "@/components/site/icons";
import { ContactSection } from "@/components/site/contact-section";
import { IMG, unsplash } from "@/lib/images";
import {
  getActiveOffers,
  getApprovedReviews,
  getCategories,
  getFeaturedServices,
  getGalleryImages,
  getInstagramImages,
  getPublicStaff,
  getReviewStats,
} from "@/server/queries/public";
import { getSalonSettings, fullAddress, instagramHandle, todayHoursLabel } from "@/server/services/settings";
import { absoluteUrl } from "@/lib/utils";

export const metadata = {
  title: { absolute: "Beauty Empire — Premium Beauty Parlour & Bridal Studio" },
  alternates: { canonical: "/" },
};

const WHY = [
  { icon: UserRoundCheck, title: "Specialists for every service", text: "Skin, hair, nails, lashes and bridal work, each with its own dedicated professional." },
  { icon: HeartHandshake, title: "Personal consultations", text: "Every service begins with understanding your skin, hair and style." },
  { icon: Gem, title: "Premium-quality products", text: "Professional, salon-grade products chosen for your skin and hair type." },
  { icon: ShieldCheck, title: "Hygienic environment", text: "Sterilised tools, fresh linen and single-use consumables for every guest." },
  { icon: Flower2, title: "Relaxing atmosphere", text: "A calm, elegant space designed for you to slow down and unwind." },
  { icon: Award, title: "Professional bridal services", text: "Trials, timelines and on-the-day artistry for flawless bridal looks." },
  { icon: BadgeIndianRupee, title: "Transparent pricing", text: "Clear starting prices online — no surprises at the counter." },
  { icon: Sparkles, title: "Honest reviews", text: "Only guests who completed an appointment can review us, and every review is shown as written." },
];

export default async function HomePage() {
  const [settings, categories, featured, offers, reviews, stats, gallery, insta, staff] = await Promise.all([
    getSalonSettings(),
    getCategories(),
    getFeaturedServices(8),
    getActiveOffers(),
    getApprovedReviews(6),
    getReviewStats(),
    getGalleryImages(),
    getInstagramImages(6),
    getPublicStaff(),
  ]);
  const serviceCount = categories.reduce((sum, c) => sum + c._count.services, 0);
  const today = todayHoursLabel(settings);
  const igHandle = instagramHandle(settings.instagramUrl);

  // Interleave gallery categories so the preview shows the full range of work.
  const byCategory = new Map<string, typeof gallery>();
  for (const g of gallery) byCategory.set(g.category, [...(byCategory.get(g.category) ?? []), g]);
  const galleryPreview: typeof gallery = [];
  for (let i = 0; galleryPreview.length < 9 && i < gallery.length; i++) {
    for (const list of byCategory.values()) if (list[i] && galleryPreview.length < 9) galleryPreview.push(list[i]!);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: settings.salonName,
    url: absoluteUrl("/"),
    image: unsplash(IMG.interiorBright, 1200),
    telephone: settings.phone,
    email: settings.email,
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: [settings.addressLine1, settings.addressLine2].filter(Boolean).join(", "),
      addressLocality: settings.city,
      addressRegion: settings.state,
      postalCode: settings.postalCode,
      addressCountry: "IN",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* ───────── 1. HERO ───────── */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="container-lux relative grid items-center gap-14 pt-10 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-14 lg:pb-28">
          <div>
            <FadeIn>
              <p className="eyebrow flex items-center gap-3">
                <span aria-hidden className="h-px w-10 bg-magenta/60" />
                {settings.tagline}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="heading-xl mt-6 text-balance">
                Your Beauty,
                <br />
                <em className="text-magenta">Our Passion.</em>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="lead mt-7 max-w-lg text-pretty">
                Discover the art of beauty, elegance and self-care at Beauty Empire — where expert hands, premium products and a
                serene space come together for you.
              </p>
            </FadeIn>
            <FadeIn delay={0.3} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/book">
                  Book Your Appointment <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/services">Explore Our Services</Link>
              </Button>
            </FadeIn>
            {/* Facts only — every figure comes from the database or settings. */}
            <FadeIn delay={0.4} className="mt-12 border-t border-rose/50 pt-7">
              <dl className="flex flex-wrap gap-x-10 gap-y-5">
                {stats.count > 0 && (
                  <div>
                    <dt className="text-xs tracking-wide text-muted-foreground">Guest rating · {stats.count} verified {stats.count === 1 ? "review" : "reviews"}</dt>
                    <dd className="mt-1 font-serif text-3xl text-charcoal">
                      {stats.average.toFixed(1)}
                      <Star aria-hidden className="ml-1 inline size-5 -translate-y-1 fill-magenta text-magenta" />
                      <span className="sr-only"> out of 5</span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground">Services</dt>
                  <dd className="mt-1 font-serif text-3xl text-charcoal">{serviceCount}</dd>
                </div>
                {staff.length > 0 && (
                  <div>
                    <dt className="text-xs tracking-wide text-muted-foreground">Specialists</dt>
                    <dd className="mt-1 font-serif text-3xl text-charcoal">{staff.length}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground">{today.open ? "Open today" : "Today"}</dt>
                  <dd className="mt-2 text-sm font-medium text-charcoal">{today.label}</dd>
                </div>
                <div>
                  <dt className="text-xs tracking-wide text-muted-foreground">Find us</dt>
                  <dd className="mt-2 text-sm font-medium">
                    <a href="#contact" className="link-inline">
                      {[settings.addressLine2, settings.city].filter(Boolean).join(", ")}
                    </a>
                  </dd>
                </div>
              </dl>
            </FadeIn>
          </div>

          <FadeIn delay={0.15} className="relative mx-auto w-full max-w-[34rem]">
            <div className="relative aspect-[4/5] w-[82%] overflow-hidden rounded-t-[14rem] rounded-b-3xl shadow-lift">
              <Image
                src={unsplash(IMG.heroBride, 1100)}
                alt="Bride with elegant traditional makeup and jewellery"
                fill
                priority
                sizes="(min-width: 1024px) 36vw, 80vw"
                className="object-cover"
              />
            </div>
            <div className="absolute right-0 bottom-10 aspect-[3/4] w-[44%] overflow-hidden rounded-3xl border-[6px] border-white shadow-lift">
              <Image src={unsplash(IMG.heroFacial, 600)} alt="Client relaxing during a facial treatment" fill sizes="20vw" className="object-cover" />
            </div>
            <Link
              href="/bridal"
              className="absolute top-10 -right-2 rounded-xl border border-border bg-white px-5 py-4 shadow-soft transition hover:border-rose sm:right-4"
            >
              <span className="block font-serif text-lg text-charcoal">Bridal Studio</span>
              <span className="block text-xs text-muted-foreground">Trials &amp; consultations →</span>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ───────── 2. WELCOME ───────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="container-lux grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal className="relative">
            <div className="grid grid-cols-5 gap-4">
              <div className="relative col-span-3 aspect-[3/4] overflow-hidden rounded-2xl">
                <Image src={unsplash(IMG.interiorWhite, 900)} alt="Bright Beauty Empire makeup studio" fill sizes="(min-width:1024px) 28vw, 60vw" className="object-cover" />
              </div>
              <div className="col-span-2 flex flex-col gap-4 pt-12">
                <div className="relative aspect-square overflow-hidden rounded-2xl">
                  <Image src={unsplash(IMG.serum, 600)} alt="Premium skincare serum" fill sizes="20vw" className="object-cover" />
                </div>
                <div className="rounded-xl bg-blush p-5">
                  <p className="font-serif text-4xl text-magenta-deep">{categories.length}</p>
                  <p className="mt-1 text-xs leading-snug text-magenta-deep">beauty disciplines under one roof</p>
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow">Our Story</p>
            <h2 className="heading-lg mt-4">Welcome to Beauty Empire</h2>
            <p className="lead mt-6">
              Beauty Empire was born from a simple belief: every woman deserves time that is entirely her own. Our salon is a
              destination for beauty, relaxation and confidence — a place where personalised care meets refined artistry.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              From restorative facials and transformative hair to bridal looks you will treasure forever, our professionals take the
              time to understand you, recommend thoughtfully and deliver with precision.
            </p>
            <Button asChild variant="link" className="mt-8 text-base">
              <Link href="/about">
                Learn more about us <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ───────── 3. SIGNATURE SERVICES ───────── */}
      <section className="bg-ivory py-24 lg:py-32">
        <div className="container-lux">
          <SectionHeading
            eyebrow="Signature Services"
            title={
              <>
                Rituals crafted for <em className="text-magenta">every you</em>
              </>
            }
            description="Explore our most-loved treatments, each delivered with premium products and meticulous care."
          />
          <Reveal className="mt-10 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/services?category=${c.slug}`}
                className="rounded-full border border-border bg-white px-4 py-2 text-[0.8rem] text-charcoal/80 transition hover:border-magenta hover:text-magenta"
              >
                {c.name}
              </Link>
            ))}
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((s, i) => (
              <Reveal key={s.id} delay={(i % 4) * 0.06}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/services">
                View all services <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───────── 3b. HOW BOOKING WORKS ───────── */}
      <section aria-labelledby="how-heading" className="border-y border-border bg-white py-16 lg:py-20">
        <div className="container-lux grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
          <div>
            <p className="eyebrow">Online booking</p>
            <h2 id="how-heading" className="heading-md mt-3">
              Book in about a minute
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Live availability, no phone calls. Pay at the salon{settings.onlinePaymentsEnabled ? " or online" : ""}.</p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              ["Choose your services", "Combine as many as you like; we schedule them back-to-back."],
              ["Pick a professional & time", "See only real free slots, or let us match you with the first available expert."],
              ["Confirm", "Get a booking reference by email, add it to your calendar, manage it any time."],
            ].map(([t, d], i) => (
              <li key={t} className="border-t-2 border-magenta pt-4">
                <span className="font-serif text-sm text-muted-rose" aria-hidden>
                  0{i + 1}
                </span>
                <h3 className="mt-1 font-serif text-xl text-charcoal">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="container-lux mt-10">
          <Button asChild>
            <Link href="/book">
              Start booking <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* ───────── 4. WHY CHOOSE US ───────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="container-lux grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-32 lg:self-start">
            <p className="eyebrow">Why Beauty Empire</p>
            <h2 className="heading-lg mt-4 text-balance">The details that make a visit feel effortless</h2>
            <p className="lead mt-5">Thoughtful care at every step, from the first consultation to the final touch.</p>
            <Button asChild variant="outline" className="mt-8">
              <Link href="/about">Meet the team</Link>
            </Button>
          </Reveal>
          <ol className="grid gap-x-10 sm:grid-cols-2">
            {WHY.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="border-t border-border py-7">
                <div className="flex items-baseline gap-4">
                  <span className="font-serif text-sm text-muted-rose tabular-nums" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2 font-serif text-xl text-charcoal">
                      <Icon className="size-4 text-magenta" aria-hidden /> {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── 5. BRIDAL STUDIO ───────── */}
      <section className="relative overflow-hidden bg-charcoal py-24 text-white lg:py-32">
        <div className="container-lux relative grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="eyebrow !text-rose">The Bridal Studio</p>
            <h2 className="mt-5 font-serif text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Your Special Day Deserves <em className="text-rose">Extraordinary</em> Beauty.
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-white/70">
              From your first consultation to the final touch-up, our bridal artists craft looks that are timeless, camera-perfect and
              unmistakably you.
            </p>
            <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 text-sm text-white/85 sm:grid-cols-2">
              {["Bridal makeup", "Bridal hairstyles", "Engagement looks", "Reception styling", "Pre-bridal skincare", "Complete bridal packages"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Sparkles className="size-4 text-rose" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/bridal#consultation">Book Your Bridal Consultation</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:border-rose hover:text-rose">
                <Link href="/bridal">Explore the Bridal Studio</Link>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="grid grid-cols-2 gap-4">
            <div className="relative mt-12 aspect-[3/4] overflow-hidden rounded-t-full rounded-b-2xl">
              <Image src={unsplash(IMG.bride2, 800)} alt="Smiling bride in traditional bridal makeup" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover" />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
              <Image src={unsplash(IMG.bride6, 800)} alt="Close-up of bridal eye makeup" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── 6. GALLERY PREVIEW ───────── */}
      {galleryPreview.length > 0 && (
      <section className="bg-white py-24 lg:py-32">
        <div className="container-lux">
          <SectionHeading
            align="left"
            eyebrow="Beauty Gallery"
            title="Moments of transformation"
            description="A glimpse into the looks, rituals and spaces that define Beauty Empire."
            action={
              <Button asChild variant="outline">
                <Link href="/gallery">
                  View full gallery <ArrowRight />
                </Link>
              </Button>
            }
          />
          <div className="mt-14 columns-2 gap-4 md:columns-3 [&>*]:mb-4">
            {galleryPreview.map((g, i) => (
              <Reveal key={g.id} delay={(i % 3) * 0.05} className="break-inside-avoid">
                <Link href="/gallery" className="group relative block overflow-hidden rounded-2xl">
                  <Image
                    src={g.imageUrl}
                    alt={g.altText}
                    width={600}
                    height={i % 3 === 1 ? 800 : 600}
                    sizes="(min-width:768px) 30vw, 48vw"
                    className="h-auto w-full object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                  <span className="absolute inset-x-3 bottom-3 translate-y-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-charcoal opacity-0 backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {g.title}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ───────── 7. OFFERS ───────── */}
      {offers.length > 0 && (
        <section className="bg-ivory py-24 lg:py-32">
          <div className="container-lux">
            <SectionHeading eyebrow="Special Offers" title="Indulge for less" description="Curated packages and seasonal offers — available for a limited time." />
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {offers.slice(0, 3).map((o, i) => (
                <Reveal key={o.id} delay={i * 0.06}>
                  <OfferCard offer={o} />
                </Reveal>
              ))}
            </div>
            {offers.length > 3 && (
              <div className="mt-12 text-center">
                <Button asChild variant="outline" size="lg">
                  <Link href="/offers">See all offers</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ───────── 8. TESTIMONIALS ───────── */}
      {reviews.length > 0 && (
        <section className="bg-white py-24 lg:py-32">
          <div className="container-lux">
            <SectionHeading
              eyebrow="Kind Words"
              title="What our guests say"
              description={stats.count ? `Rated ${stats.average.toFixed(1)} out of 5 from ${stats.count} verified reviews.` : undefined}
            />
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r, i) => (
                <Reveal key={r.id} delay={(i % 3) * 0.06}>
                  <TestimonialCard review={r} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────── 9. INSTAGRAM ───────── */}
      {insta.length > 0 && settings.instagramUrl && (
        <section className="bg-blush/50 py-24">
          <div className="container-lux">
            <SectionHeading eyebrow={igHandle ?? "Instagram"} title="Follow our story" description="Fresh looks, behind-the-scenes moments and beauty inspiration." />
            <div className="mt-12 grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-6">
              {insta.map((img) => (
                <a
                  key={img.id}
                  href={settings.instagramUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-xl"
                  aria-label={`${img.altText} — view on Instagram`}
                >
                  <Image src={img.imageUrl} alt={img.altText} fill sizes="(min-width:1024px) 16vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <span className="absolute inset-0 flex items-center justify-center bg-magenta-deep/0 text-white opacity-0 transition-all duration-500 group-hover:bg-magenta-deep/45 group-hover:opacity-100">
                    <InstagramIcon className="size-7" />
                  </span>
                </a>
              ))}
            </div>
            {settings.instagramUrl && (
              <div className="mt-12 text-center">
                <Button asChild>
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                    <InstagramIcon className="size-4" /> Follow Us on Instagram
                  </a>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ───────── 10. CONTACT & LOCATION ───────── */}
      <ContactSection settings={settings} address={fullAddress(settings)} />
    </>
  );
}
