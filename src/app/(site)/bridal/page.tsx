import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarHeart, Check, Crown, Gem, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/site/cards";
import { ContactForm } from "@/components/site/contact-form";
import { Reveal } from "@/components/site/motion";
import { SectionHeading } from "@/components/site/section";
import { WhatsappIcon } from "@/components/site/icons";
import { getBridalServices, getGalleryImages, getPackages } from "@/server/queries/public";
import { getSalonSettings } from "@/server/services/settings";
import { IMG, unsplash } from "@/lib/images";
import { formatINR } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Bridal Studio — Bridal Makeup & Packages",
  description: "Bridal makeup, hairstyling, engagement and reception looks, pre-bridal skincare and complete bridal packages at Beauty Empire's Bridal Studio.",
  alternates: { canonical: "/bridal" },
};

const STEPS = [
  { icon: CalendarHeart, title: "Consultation", text: "We discuss your outfits, jewellery, skin, and the look you dream of." },
  { icon: Palette, title: "Bridal trial", text: "A full trial to perfect tones, textures and hairstyle before the day." },
  { icon: Sparkles, title: "Pre-bridal care", text: "A personalised plan of facials, hair spa and body rituals for radiance." },
  { icon: Crown, title: "Your big day", text: "Calm, punctual artistry with long-wear products and touch-up support." },
];

export default async function BridalPage() {
  const [services, packages, gallery, settings] = await Promise.all([getBridalServices(), getPackages({ bridal: true }), getGalleryImages("BRIDAL_MAKEUP"), getSalonSettings()]);
  const bridalMakeup = services.find((s) => s.slug === "bridal-makeup") ?? services[0];

  return (
    <>
      <section className="relative overflow-hidden bg-charcoal text-white">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-0 size-[36rem] rounded-full bg-magenta/30 blur-[140px]" />
        <div className="container-lux relative grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <Reveal>
            <p className="eyebrow !text-rose">The Bridal Studio</p>
            <h1 className="mt-6 font-serif text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Your Special Day Deserves <em className="text-rose">Extraordinary</em> Beauty.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/70">
              Timeless bridal artistry for every ceremony — mehendi, engagement, wedding and reception — designed around your story,
              your outfits and your skin.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="#consultation">Book Your Bridal Consultation</a>
              </Button>
              {bridalMakeup && (
                <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:border-rose hover:text-rose">
                  <Link href={`/book?service=${bridalMakeup.id}`}>Book a bridal trial</Link>
                </Button>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.15} className="grid grid-cols-2 gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-2xl">
              <Image src={unsplash(IMG.bride1, 800)} alt="Bride in red lehenga with gold jewellery" fill priority sizes="(min-width:1024px) 20vw, 45vw" className="object-cover" />
            </div>
            <div className="relative mt-16 aspect-[3/4] overflow-hidden rounded-2xl">
              <Image src={unsplash(IMG.bride7, 800)} alt="Bride with kundan jewellery and dewy makeup" fill priority sizes="(min-width:1024px) 20vw, 45vw" className="object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Your Journey" title="How we prepare you for the big day" />
          <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.06}>
                <li className="h-full rounded-2xl border border-border bg-ivory/60 p-7">
                  <span className="font-serif text-sm text-muted-rose">0{i + 1}</span>
                  <Icon className="mt-4 size-6 text-magenta" aria-hidden />
                  <h3 className="mt-4 font-serif text-xl text-charcoal">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {packages.length > 0 && (
        <section className="bg-ivory py-24">
          <div className="container-lux">
            <SectionHeading eyebrow="Bridal Packages" title="Complete bridal packages" description="Thoughtfully bundled experiences — better value, seamless planning." />
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {packages.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.06}>
                  <article className="grid h-full overflow-hidden rounded-2xl border border-border bg-white sm:grid-cols-[0.8fr_1.2fr]">
                    <div className="relative min-h-56 bg-blush">
                      {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="(min-width:1024px) 20vw, 100vw" className="object-cover" />}
                    </div>
                    <div className="flex flex-col p-7">
                      <Gem className="size-5 text-magenta" aria-hidden />
                      <h3 className="mt-3 font-serif text-2xl text-charcoal">{p.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                      <ul className="mt-4 space-y-1.5 text-sm text-charcoal/80">
                        {p.services.map((s) => (
                          <li key={s.id} className="flex items-center gap-2">
                            <Check className="size-4 text-magenta" aria-hidden /> {s.name}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                        <p>
                          <span className="font-serif text-3xl text-magenta">{formatINR(p.price)}</span>
                          {p.worth > p.price && <s className="ml-2 text-sm text-muted-foreground">{formatINR(p.worth)}</s>}
                        </p>
                        <Button asChild size="sm">
                          <Link href={`/book?${p.services.map((s) => `service=${s.id}`).join("&")}`}>Book package services</Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Package pricing is confirmed during your consultation; online bookings show individual service prices.
            </p>
          </div>
        </section>
      )}

      <section className="bg-white py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Bridal & Occasion" title="Bridal services" />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <Reveal key={s.id} delay={(i % 4) * 0.05}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="bg-ivory py-24">
          <div className="container-lux">
            <SectionHeading eyebrow="Our Brides" title="Real bridal looks" />
            <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
              {gallery.slice(0, 6).map((g, i) => (
                <Reveal key={g.id} delay={(i % 3) * 0.05} className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                  <Image src={g.imageUrl} alt={g.altText} fill sizes="(min-width:768px) 30vw, 48vw" className="object-cover transition-transform duration-700 hover:scale-105" />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="consultation" className="scroll-mt-24 bg-white py-24">
        <div className="container-lux grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="eyebrow">Bridal Consultation</p>
            <h2 className="heading-lg mt-4">Let&apos;s plan your bridal look</h2>
            <p className="lead mt-5">
              Share your wedding dates and a little about your ceremonies. Our bridal team will call you to schedule a complimentary
              consultation.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <a
                  href={whatsappLink(settings.whatsappNumber, "Hello Beauty Empire! I'd like to book a bridal consultation. My wedding date is: ")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsappIcon className="size-4 text-[#1f9d55]" /> WhatsApp the bridal team
                </a>
              </Button>
              {bridalMakeup && (
                <Button asChild variant="secondary">
                  <Link href={`/book?service=${bridalMakeup.id}`}>Book a trial online</Link>
                </Button>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="rounded-2xl border border-border bg-ivory/60 p-6 sm:p-10">
            <ContactForm defaultSubject="Bridal consultation request" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
