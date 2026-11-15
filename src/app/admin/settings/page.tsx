import { PageHeader } from "@/components/dashboard/shell";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";
import { integrations } from "@/server/env";
import { minutesToHHMM } from "@/lib/time";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const s = await getSalonSettings();
  return (
    <>
      <PageHeader title="Settings" description="Salon details, hours, booking rules, payments and policies. Changes apply immediately." />
      <SettingsForm
        razorpayConfigured={integrations.razorpay}
        defaults={{
          salonName: s.salonName,
          tagline: s.tagline,
          addressLine1: s.addressLine1,
          addressLine2: s.addressLine2 ?? "",
          city: s.city,
          state: s.state,
          postalCode: s.postalCode,
          phone: s.phone,
          whatsappNumber: s.whatsappNumber,
          email: s.email,
          googleMapsEmbedUrl: s.googleMapsEmbedUrl ?? "",
          googleMapsLink: s.googleMapsLink ?? "",
          instagramUrl: s.instagramUrl ?? "",
          facebookUrl: s.facebookUrl ?? "",
          youtubeUrl: s.youtubeUrl ?? "",
          businessHours: Array.from({ length: 7 }, (_, d) => {
            const h = s.businessHours[String(d)]!;
            return { closed: h.closed, open: minutesToHHMM(h.open), close: minutesToHHMM(h.close) };
          }),
          slotIntervalMinutes: s.slotIntervalMinutes,
          minLeadTimeMinutes: s.minLeadTimeMinutes,
          maxAdvanceDays: s.maxAdvanceDays,
          bufferMinutes: s.bufferMinutes,
          autoConfirmBookings: s.autoConfirmBookings,
          cancellationWindowHours: s.cancellationWindowHours,
          bookingPolicy: s.bookingPolicy,
          cancellationPolicy: s.cancellationPolicy,
          onlinePaymentsEnabled: s.onlinePaymentsEnabled && integrations.razorpay,
          payAtSalonEnabled: s.payAtSalonEnabled,
        }}
      />
    </>
  );
}
