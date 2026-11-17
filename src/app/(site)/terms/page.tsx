import type { Metadata } from "next";
import { PageHero } from "@/components/site/section";
import { getSalonSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSalonSettings();
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" description="The terms that apply when you book and use our services." />
      <section className="bg-white py-16">
        <div className="container-lux prose-lux max-w-3xl">
          <h2>Bookings</h2>
          <p className="whitespace-pre-line">{s.bookingPolicy}</p>
          <h2>Cancellations &amp; rescheduling</h2>
          <p className="whitespace-pre-line">{s.cancellationPolicy}</p>
          <h2>Pricing</h2>
          <p>
            Prices shown online are starting prices in Indian Rupees (INR) and include applicable taxes unless stated otherwise. Final
            pricing may vary with hair length, product choice or design complexity; your stylist will always confirm before starting.
          </p>
          <h2>Payments</h2>
          <p>
            You may pay at the salon or, where enabled, online via Razorpay. An online booking is marked paid only after the payment is
            verified with Razorpay. Refunds for eligible cancellations are returned to the original payment method.
          </p>
          <h2>Health &amp; safety</h2>
          <p>
            Please inform us of allergies, skin conditions, pregnancy or medical conditions before your service. We may recommend a
            patch test for certain treatments and reserve the right to decline a service where it may not be safe.
          </p>
          <h2>Reviews</h2>
          <p>Reviews may be submitted for completed appointments and are moderated before publication.</p>
          <h2>Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href={`mailto:${s.email}`} className="link-inline">
              {s.email}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
