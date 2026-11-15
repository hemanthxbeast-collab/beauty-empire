import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./contact-form";
import { WhatsappIcon } from "./icons";
import { Reveal } from "./motion";
import { SectionHeading } from "./section";
import { DAY_NAMES } from "@/lib/constants";
import { formatMinuteOfDay } from "@/lib/time";
import { bookingEnquiryMessage, formatPhone, whatsappLink } from "@/lib/whatsapp";
import type { SalonSettingsData } from "@/server/services/settings";

export function BusinessHours({ settings }: { settings: SalonSettingsData }) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-sm">
      {order.map((d) => {
        const h = settings.businessHours[String(d)]!;
        return (
          <div key={d} className="contents">
            <dt className="text-muted-foreground">{DAY_NAMES[d]}</dt>
            <dd className="text-charcoal">{h.closed ? "Closed" : `${formatMinuteOfDay(h.open)} – ${formatMinuteOfDay(h.close)}`}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function ContactSection({ settings, address, heading = true }: { settings: SalonSettingsData; address: string; heading?: boolean }) {
  return (
    <section className="bg-ivory py-24 lg:py-32" id="contact">
      <div className="container-lux">
        {heading && <SectionHeading eyebrow="Visit Us" title="We would love to welcome you" description="Drop by, call, WhatsApp or send us a message — we're here to help." />}
        <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
              {settings.googleMapsEmbedUrl ? (
                <iframe
                  title={`Map showing ${settings.salonName}`}
                  src={settings.googleMapsEmbedUrl}
                  className="aspect-[16/10] w-full border-0 grayscale-[35%]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              ) : (
                <div className="flex aspect-[16/10] items-center justify-center bg-blush text-sm text-muted-foreground">Map unavailable</div>
              )}
              <div className="space-y-4 p-6 text-sm">
                <p className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-magenta" aria-hidden />
                  <span>
                    {address}
                    {settings.googleMapsLink && (
                      <a href={settings.googleMapsLink} target="_blank" rel="noopener noreferrer" className="ml-2 font-medium text-magenta hover:underline">
                        Get directions
                      </a>
                    )}
                  </span>
                </p>
                <p className="flex gap-3">
                  <Phone className="size-4 shrink-0 text-magenta" aria-hidden />
                  <a href={`tel:${settings.phone}`} className="hover:text-magenta">
                    {formatPhone(settings.phone)}
                  </a>
                </p>
                <p className="flex gap-3">
                  <Mail className="size-4 shrink-0 text-magenta" aria-hidden />
                  <a href={`mailto:${settings.email}`} className="hover:text-magenta">
                    {settings.email}
                  </a>
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-soft">
                <p className="flex items-center gap-2 font-serif text-lg text-charcoal">
                  <Clock className="size-4 text-magenta" aria-hidden /> Business hours
                </p>
                <div className="mt-4">
                  <BusinessHours settings={settings} />
                </div>
              </div>
              <div className="flex flex-col justify-between rounded-2xl bg-charcoal p-6 text-white">
                <div>
                  <p className="font-serif text-lg">Prefer WhatsApp?</p>
                  <p className="mt-2 text-sm text-white/70">Message us for quick questions, bridal enquiries or same-day availability.</p>
                </div>
                <Button asChild className="mt-6 bg-[#1f9d55] shadow-none hover:bg-[#188a4a]">
                  <a href={whatsappLink(settings.whatsappNumber, bookingEnquiryMessage())} target="_blank" rel="noopener noreferrer">
                    <WhatsappIcon className="size-4" /> Chat on WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="rounded-2xl border border-border bg-white p-6 shadow-soft sm:p-10">
            <h3 className="font-serif text-3xl text-charcoal">Send us a message</h3>
            <p className="mt-2 mb-8 text-sm text-muted-foreground">We usually reply within one business day.</p>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
