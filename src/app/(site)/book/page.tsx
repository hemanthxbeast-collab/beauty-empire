import type { Metadata } from "next";
import { BookingWizard, type WizardData } from "@/components/booking/booking-wizard";
import { prisma } from "@/server/db";
import { integrations } from "@/server/env";
import { getCurrentUser } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";
import { getActiveOffers } from "@/server/queries/public";
import { addDaysToDateKey, dateKeyInTz } from "@/lib/time";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Book your beauty appointment online in a few simple steps — choose services, your professional, date and time.",
  alternates: { canonical: "/book" },
};

type SP = Promise<{ service?: string | string[]; staff?: string; offer?: string }>;

export default async function BookPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [settings, user, categories, staff] = await Promise.all([
    getSalonSettings(),
    getCurrentUser(),
    prisma.serviceCategory.findMany({
      where: { isActive: true, services: { some: { status: "ACTIVE" } } },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        services: {
          where: { status: "ACTIVE" },
          orderBy: { displayOrder: "asc" },
          select: { id: true, name: true, shortDescription: true, price: true, discountPrice: true, durationMinutes: true, imageUrl: true, staff: { select: { staffId: true } } },
        },
      },
    }),
    prisma.staffProfile.findMany({
      where: { isBookable: true, user: { isActive: true, role: "STAFF" } },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        title: true,
        photoUrl: true,
        specialties: true,
        yearsOfExperience: true,
        user: { select: { name: true } },
        availability: { where: { isAvailable: true }, select: { dayOfWeek: true } },
      },
    }),
  ]);
  const offers = await getActiveOffers(settings.timezone);

  const profile =
    user?.role === "CUSTOMER" && user.customerProfileId
      ? await prisma.customerProfile.findUnique({ where: { id: user.customerProfileId }, select: { preferredStaffId: true } })
      : null;

  const allServiceIds = new Set(categories.flatMap((c) => c.services.map((s) => s.id)));
  const requested = (Array.isArray(sp.service) ? sp.service : sp.service ? [sp.service] : []).filter((id) => allServiceIds.has(id));
  const offer = sp.offer ? offers.find((o) => o.id === sp.offer) : undefined;
  const preselected = [...new Set([...requested, ...(offer?.services.map((s) => s.id).filter((id) => allServiceIds.has(id)) ?? [])])].slice(0, 6);

  const today = dateKeyInTz(new Date(), settings.timezone);
  const data: WizardData = {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      services: c.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.shortDescription,
        price: toNumber(s.discountPrice ?? s.price),
        originalPrice: s.discountPrice ? toNumber(s.price) : null,
        durationMinutes: s.durationMinutes,
        imageUrl: s.imageUrl,
        staffIds: s.staff.map((x) => x.staffId),
      })),
    })),
    staff: staff.map((s) => ({
      id: s.id,
      name: s.user.name,
      title: s.title,
      photoUrl: s.photoUrl,
      specialties: s.specialties,
      years: s.yearsOfExperience,
      workingDays: s.availability.map((a) => a.dayOfWeek),
    })),
    closedWeekdays: Object.entries(settings.businessHours)
      .filter(([, h]) => h.closed)
      .map(([d]) => Number(d)),
    today,
    lastDate: addDaysToDateKey(today, settings.maxAdvanceDays),
    payAtSalon: settings.payAtSalonEnabled,
    onlinePayments: settings.onlinePaymentsEnabled && integrations.razorpay,
    bookingPolicy: settings.bookingPolicy,
    cancellationPolicy: settings.cancellationPolicy,
    whatsappNumber: settings.whatsappNumber,
    offer: offer
      ? { id: offer.id, title: offer.title, percent: offer.discountPercent, serviceIds: offer.services.map((s) => s.id) }
      : null,
    preselectedServiceIds: preselected,
    preselectedStaffId: sp.staff && staff.some((s) => s.id === sp.staff) ? sp.staff : (profile?.preferredStaffId ?? null),
    user:
      user && user.role === "CUSTOMER"
        ? { name: user.name, email: user.email, phone: user.phone ?? "" }
        : null,
    signedInAsStaff: Boolean(user && user.role !== "CUSTOMER"),
  };

  return (
    <section className="min-h-[80vh] bg-ivory pb-24">
      <div className="container-lux pt-10 lg:pt-14">
        <p className="eyebrow">Online Booking</p>
        <h1 className="heading-lg mt-3">Book your appointment</h1>
        <BookingWizard data={data} />
      </div>
    </section>
  );
}
