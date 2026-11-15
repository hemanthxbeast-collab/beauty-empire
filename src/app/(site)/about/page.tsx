import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero, SectionHeading } from "@/components/site/section";
import { Reveal } from "@/components/site/motion";
import { getPublicStaff } from "@/server/queries/public";
import { IMG, unsplash } from "@/lib/images";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet Beauty Empire — a premium women's beauty parlour and bridal studio built on artistry, hygiene and personal care.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: Heart, title: "Personal, always", text: "No two guests are alike. We listen first, then tailor every detail." },
  { icon: ShieldCheck, title: "Uncompromising hygiene", text: "Hospital-grade sterilisation, fresh linen and single-use consumables." },
  { icon: Leaf, title: "Thoughtful products", text: "Professional formulations chosen for performance and skin health." },
  { icon: Sparkles, title: "Quiet luxury", text: "A calm, beautiful space where you can truly switch off." },
];

export default async function AboutPage() {
  const staff = await getPublicStaff();
  return (
    <>
      <PageHero
        eyebrow="About Beauty Empire"
        title={
          <>
            Where beauty meets <em className="text-magenta">elegance</em>
          </>
        }
        description="We created Beauty Empire as a sanctuary for women — a place to feel cared for, confident and completely yourself."
        image={unsplash(IMG.interiorBright, 900)}
      />

      <section className="bg-white py-24">
        <div className="container-lux grid items-center gap-14 lg:grid-cols-2">
          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image src={unsplash(IMG.team, 1100)} alt="Beauty Empire stylists together in the salon" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow">Our Story</p>
            <h2 className="heading-lg mt-4">A decade of artistry, one guest at a time</h2>
            <div className="prose-lux mt-6">
              <p>
                What began as a small bridal studio has grown into a full-service beauty destination. Through every season, one thing
                hasn&apos;t changed — our belief that great beauty starts with genuinely understanding the person in the chair.
              </p>
              <p>
                Today our team of specialists brings together skin science, hair craftsmanship and bridal artistry under one roof, with
                the warmth and attention to detail that our guests return for.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-ivory py-24">
        <div className="container-lux">
          <SectionHeading eyebrow="Our Values" title="What we stand for" />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 0.05} className="rounded-2xl border border-border bg-white p-7">
                <Icon className="size-6 text-magenta" aria-hidden />
                <h3 className="mt-5 font-serif text-xl text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {staff.length > 0 && (
        <section className="bg-white py-24">
          <div className="container-lux">
            <SectionHeading eyebrow="Our Team" title="Meet the specialists" description="Experienced, certified and passionate about their craft." />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {staff.map((s, i) => (
                <Reveal key={s.id} delay={(i % 5) * 0.05} className="rounded-2xl border border-border bg-white p-6 text-center">
                  {s.photoUrl ? (
                    <Image src={s.photoUrl} alt={s.user.name} width={112} height={112} className="mx-auto size-28 rounded-full object-cover" />
                  ) : (
                    <span className="mx-auto flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-blush to-rose/60 font-serif text-3xl text-magenta-deep">
                      {initials(s.user.name)}
                    </span>
                  )}
                  <h3 className="mt-5 font-serif text-xl text-charcoal">{s.user.name}</h3>
                  <p className="mt-1 text-xs text-muted-rose">{s.title}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{s.yearsOfExperience}+ years · {s.specialties.slice(0, 2).join(", ")}</p>
                </Reveal>
              ))}
            </div>
            <div className="mt-14 text-center">
              <Button asChild size="lg">
                <Link href="/book">
                  Book with our team <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
