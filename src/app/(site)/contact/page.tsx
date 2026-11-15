import type { Metadata } from "next";
import { PageHero } from "@/components/site/section";
import { ContactSection } from "@/components/site/contact-section";
import { fullAddress, getSalonSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Find Beauty Empire — address, phone, WhatsApp, business hours and a contact form.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSalonSettings();
  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title={
          <>
            We&apos;re here <em className="text-magenta">for you</em>
          </>
        }
        description="Questions about a service, a bridal enquiry or help with a booking — reach out any way you like."
      />
      <div className="-mt-16">
        <ContactSection settings={settings} address={fullAddress(settings)} heading={false} />
      </div>
    </>
  );
}
