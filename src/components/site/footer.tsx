import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./logo";
import { FacebookIcon, InstagramIcon, WhatsappIcon, YoutubeIcon } from "./icons";
import { NAV_LINKS, DAY_NAMES } from "@/lib/constants";
import { formatMinuteOfDay } from "@/lib/time";
import { formatPhone, whatsappLink, bookingEnquiryMessage } from "@/lib/whatsapp";
import type { SalonSettingsData } from "@/server/services/settings";

type Props = {
  settings: SalonSettingsData;
  categories: Array<{ name: string; slug: string }>;
};

function hoursSummary(settings: SalonSettingsData) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((d) => {
    const h = settings.businessHours[String(d)]!;
    return { day: DAY_NAMES[d]!.slice(0, 3), text: h.closed ? "Closed" : `${formatMinuteOfDay(h.open)} – ${formatMinuteOfDay(h.close)}` };
  });
}

export function Footer({ settings, categories }: Props) {
  const year = new Date().getFullYear();
  const socials = [
    { href: settings.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: settings.facebookUrl, label: "Facebook", Icon: FacebookIcon },
    { href: settings.youtubeUrl, label: "YouTube", Icon: YoutubeIcon },
    { href: whatsappLink(settings.whatsappNumber, bookingEnquiryMessage()), label: "WhatsApp", Icon: WhatsappIcon },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden bg-charcoal text-white/80">
      <div className="container-lux relative grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/60">
            A sanctuary for beauty, confidence and self-care. From signature facials to once-in-a-lifetime bridal looks, every
            visit is crafted around you.
          </p>
          <div className="mt-8 flex gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href!}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-rose hover:bg-magenta hover:text-white"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="eyebrow !text-rose">Explore</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/book" className="transition-colors hover:text-white">
                Book Appointment
              </Link>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h2 className="eyebrow !text-rose">Services</h2>
          <ul className="mt-5 space-y-3 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/services?category=${c.slug}`} className="transition-colors hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 text-sm lg:col-span-3">
          <h2 className="eyebrow !text-rose">Visit Us</h2>
          <p className="flex gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
            <span>
              {settings.addressLine1}
              {settings.addressLine2 ? `, ${settings.addressLine2}` : ""}
              <br />
              {settings.city}, {settings.state} {settings.postalCode}
            </span>
          </p>
          <p className="flex gap-3">
            <Phone className="size-4 shrink-0 text-rose" aria-hidden />
            <a href={`tel:${settings.phone}`} className="hover:text-white">
              {formatPhone(settings.phone)}
            </a>
          </p>
          <p className="flex gap-3">
            <Mail className="size-4 shrink-0 text-rose" aria-hidden />
            <a href={`mailto:${settings.email}`} className="hover:text-white">
              {settings.email}
            </a>
          </p>
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
            <dl className="grid grid-cols-[2.5rem_1fr] gap-x-2 gap-y-1 text-[0.8rem]">
              {hoursSummary(settings).map((h) => (
                <div key={h.day} className="contents">
                  <dt className="text-white/50">{h.day}</dt>
                  <dd>{h.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-lux flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {year} {settings.salonName}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
