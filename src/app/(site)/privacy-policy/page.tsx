import type { Metadata } from "next";
import { PageHero } from "@/components/site/section";
import { getSalonSettings } from "@/server/services/settings";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy-policy" } };

export default async function PrivacyPage() {
  const s = await getSalonSettings();
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" description="How we collect, use and protect your personal information." />
      <section className="bg-white py-16">
        <div className="container-lux prose-lux max-w-3xl">
          <p>
            This policy explains how {s.salonName} (&quot;we&quot;, &quot;us&quot;) handles personal data when you use our website, create an account or book
            an appointment. We follow the principles of India&apos;s Digital Personal Data Protection Act, 2023.
          </p>
          <h2>Information we collect</h2>
          <ul>
            <li>Account details: name, email address, phone number and a securely hashed password.</li>
            <li>Booking details: services, preferred professional, appointment times, notes and special requirements you share with us.</li>
            <li>Optional preferences you add to your profile (e.g. skin or hair type) to personalise your care.</li>
            <li>Payment status and transaction references. We never receive or store your card or bank details — online payments are processed by Razorpay.</li>
            <li>Technical data such as IP address and browser type, used for security and to prevent abuse.</li>
          </ul>
          <h2>How we use it</h2>
          <ul>
            <li>To manage your appointments and send confirmations, reminders and updates.</li>
            <li>To provide safe, personalised services and respond to your enquiries.</li>
            <li>To protect our services from fraud and misuse.</li>
            <li>To send marketing messages only if you opt in — you can opt out at any time from your profile.</li>
          </ul>
          <h2>Sharing</h2>
          <p>
            We do not sell your personal data. We share it only with service providers that help us operate, under appropriate
            confidentiality obligations, or where required by law: our hosting and database providers, Resend (email delivery),
            Razorpay (online payments, if you pay online), Cloudinary (images uploaded by the salon) and Upstash (abuse protection).
          </p>
          <h2>Security &amp; retention</h2>
          <p>
            Data is encrypted in transit, passwords are hashed with an industry-standard algorithm, and access to customer data is
            restricted by role. We retain booking records for as long as needed for service, legal and accounting purposes.
          </p>
          <h2>Your rights</h2>
          <p>
            You may access and update your information from your account and delete your account yourself from{" "}
            <strong>My Account → Profile → Delete account</strong>. You can also ask us to correct or erase your data by emailing{" "}
            <a href={`mailto:${s.email}`} className="link-inline">
              {s.email}
            </a>
            .
          </p>
          <p className="text-xs">Last updated: {new Date().getFullYear()}</p>
        </div>
      </section>
    </>
  );
}
