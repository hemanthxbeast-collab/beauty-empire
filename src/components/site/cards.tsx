import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDuration, formatINR, initials } from "@/lib/utils";
import type { OfferCardData, ServiceCardData } from "@/server/queries/public";

export function ServiceCard({ service, priority }: { service: ServiceCardData; priority?: boolean }) {
  const effective = service.discountPrice ?? service.price;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-lift">
      <Link href={`/services/${service.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-blush" tabIndex={-1} aria-hidden>
        {service.imageUrl && (
          <Image
            src={service.imageUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 90vw"
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.06]"
          />
        )}
        <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.18em] text-magenta-deep uppercase backdrop-blur">
          {service.category.name}
        </span>
        {service.discountPrice && (
          <span className="absolute top-4 right-4 rounded-full bg-magenta px-3 py-1 text-[0.65rem] font-semibold tracking-wider text-white">Special price</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-[1.45rem] leading-snug text-charcoal">
          <Link href={`/services/${service.slug}`} className="transition-colors hover:text-magenta">
            {service.name}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{service.shortDescription}</p>
        <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-[0.65rem] tracking-[0.18em] text-muted-rose uppercase">Starting at</p>
            <p className="mt-0.5 font-serif text-xl text-charcoal">
              {formatINR(effective)}
              {service.discountPrice && <s className="ml-2 font-sans text-xs text-muted-foreground">{formatINR(service.price)}</s>}
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 text-muted-rose" aria-hidden />
            {formatDuration(service.durationMinutes)}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button asChild variant="outline" size="sm">
            <Link href={`/services/${service.slug}`}>
              View Details<span className="sr-only">: {service.name}</span>
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/book?service=${service.id}`}>
              Book Now<span className="sr-only">: {service.name}</span>
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function OfferCard({ offer }: { offer: OfferCardData }) {
  const until = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(offer.validUntil);
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-500 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden bg-blush">
        {offer.imageUrl && (
          <Image src={offer.imageUrl} alt="" fill sizes="(min-width: 1024px) 30vw, 90vw" className="object-cover transition-transform duration-[1.2s] group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent" />
        <span className="absolute bottom-4 left-4 rounded-full bg-white px-3.5 py-1.5 font-serif text-lg text-magenta-deep">{offer.discountPercent}% off</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-2xl text-charcoal">{offer.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{offer.description}</p>
        {offer.services.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {offer.services.map((s) => (
              <li key={s.id} className="rounded-full bg-ivory px-2.5 py-1 text-[0.7rem] text-charcoal/70 ring-1 ring-border">
                {s.name}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto pt-6">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-3xl text-magenta">{formatINR(offer.discountedPrice)}</span>
            <s className="text-sm text-muted-foreground">{formatINR(offer.originalPrice)}</s>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5 text-muted-rose" aria-hidden /> Valid until {until}
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href={`/book?offer=${offer.id}`}>
              Book Now<span className="sr-only">: {offer.title}</span> <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)} role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={cn("size-4", i <= Math.round(rating) ? "fill-magenta text-magenta" : "fill-rose/30 text-rose/50")} />
      ))}
    </div>
  );
}

export function TestimonialCard({ review }: { review: { rating: number; title: string | null; comment: string; customerName: string; serviceName: string | null } }) {
  return (
    <figure className="relative flex h-full flex-col rounded-2xl border border-border bg-white p-8 shadow-soft">
      <Quote aria-hidden className="absolute top-7 right-7 size-9 text-blush" />
      <Stars rating={review.rating} />
      {review.title && <p className="mt-5 font-serif text-xl text-charcoal">“{review.title}”</p>}
      <blockquote className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-muted-foreground">{review.comment}</blockquote>
      <figcaption className="mt-7 flex items-center gap-3 border-t border-border pt-5">
        <span className="flex size-11 items-center justify-center rounded-full bg-blush font-serif text-magenta-deep">{initials(review.customerName)}</span>
        <span>
          <span className="block text-sm font-semibold text-charcoal">{review.customerName}</span>
          {review.serviceName && <span className="block text-xs text-muted-rose">{review.serviceName}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
