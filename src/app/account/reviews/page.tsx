import Link from "next/link";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { Stars } from "@/components/site/cards";
import { requireCustomer } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { formatInTz } from "@/lib/time";

export const metadata = { title: "My reviews" };

export default async function MyReviewsPage() {
  const user = await requireCustomer();
  const settings = await getSalonSettings();
  const [reviews, awaiting] = await Promise.all([
    prisma.review.findMany({
      where: { customerId: user.customerProfileId },
      orderBy: { createdAt: "desc" },
      include: { appointment: { select: { id: true, reference: true, startAt: true } }, service: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: { customerId: user.customerProfileId, status: "COMPLETED", review: null },
      orderBy: { startAt: "desc" },
      take: 10,
      select: { id: true, startAt: true, services: { select: { serviceName: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="My reviews" description="Share your experience — reviews are published after moderation." />
      {awaiting.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-2xl text-charcoal">Awaiting your review</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {awaiting.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5">
                <div>
                  <p className="font-medium text-charcoal">{a.services.map((s) => s.serviceName).join(", ")}</p>
                  <p className="text-xs text-muted-foreground">{formatInTz(a.startAt, "d MMM yyyy", settings.timezone)}</p>
                </div>
                <Link href={`/account/appointments/${a.id}`} className="rounded-full bg-blush px-4 py-2 text-sm text-magenta-deep hover:bg-rose/60">
                  Write review
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {reviews.length === 0 ? (
        <EmptyState icon={<Star className="size-5" />} title="No reviews yet" description="After a completed appointment you can share your experience here." />
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Stars rating={r.rating} />
                <Badge variant={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>
                  {r.status === "APPROVED" ? "Published" : r.status === "REJECTED" ? "Not published" : "Awaiting moderation"}
                </Badge>
              </div>
              {r.title && <p className="mt-3 font-serif text-lg text-charcoal">{r.title}</p>}
              <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
              <p className="mt-3 text-xs text-muted-rose">
                {r.service?.name ?? "Appointment"} · {formatInTz(r.appointment.startAt, "d MMM yyyy", settings.timezone)} · {r.appointment.reference}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
