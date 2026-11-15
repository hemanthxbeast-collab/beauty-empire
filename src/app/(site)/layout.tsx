import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { WhatsappFloat } from "@/components/site/whatsapp-float";
import { getCurrentUser } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";
import { getCategories } from "@/server/queries/public";
import { bookingEnquiryMessage, whatsappLink } from "@/lib/whatsapp";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, categories] = await Promise.all([getCurrentUser(), getSalonSettings(), getCategories()]);
  return (
    <>
      <Navbar user={user ? { name: user.name, role: user.role } : null} />
      <main id="main">{children}</main>
      <Footer settings={settings} categories={categories.map((c) => ({ name: c.name, slug: c.slug }))} />
      <WhatsappFloat href={whatsappLink(settings.whatsappNumber, bookingEnquiryMessage())} />
    </>
  );
}
