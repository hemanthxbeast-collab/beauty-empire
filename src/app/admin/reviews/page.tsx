import { MessageSquareHeart } from "lucide-react";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { FilterBar, SelectField } from "@/components/admin/filters";
import { Stars } from "@/components/site/cards";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { deleteReviewAction, moderateReviewAction } from "@/server/actions/admin-ops";
import { formatInTz } from "@/lib/time";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const s = status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? status : undefined;
  const [settings, reviews] = await Promise.all([
    getSalonSettings(),
    prisma.review.findMany({
      where: s ? { status: s } : {},
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { customer: { select: { user: { select: { name: true, email: true } } } }, service: { select: { name: true } }, appointment: { select: { reference: true } } },
    }),
  ]);
  return (
    <>
      <PageHeader title="Reviews" description="Only approved reviews from completed appointments are shown publicly." />
      <FilterBar action="/admin/reviews" resetHref="/admin/reviews">
        <SelectField name="status" label="Status" defaultValue={s} options={[["", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]]} />
      </FilterBar>
      {reviews.length === 0 ? (
        <EmptyState icon={<MessageSquareHeart className="size-5" />} title="No reviews" description="Reviews submitted by customers will appear here for moderation." />
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} />
                    <Badge variant={r.status === "APPROVED" ? "success" : r.status === "REJECTED" ? "danger" : "warning"}>{r.status.toLowerCase()}</Badge>
                    {r.isFeatured && <Badge>Featured</Badge>}
                  </div>
                  {r.title && <p className="mt-3 font-serif text-lg text-charcoal">{r.title}</p>}
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{r.comment}</p>
                  <p className="mt-3 text-xs text-muted-rose">
                    {r.customer.user.name} ({r.customer.user.email}) · {r.service?.name ?? "—"} · {r.appointment.reference} · {formatInTz(r.createdAt, "d MMM yyyy", settings.timezone)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {r.status !== "APPROVED" && (
                    <ActionButton action={moderateReviewAction} args={{ reviewId: r.id, status: "APPROVED" }}>
                      Approve
                    </ActionButton>
                  )}
                  {r.status !== "REJECTED" && (
                    <ActionButton action={moderateReviewAction} args={{ reviewId: r.id, status: "REJECTED" }} variant="outline">
                      Reject
                    </ActionButton>
                  )}
                  {r.status === "APPROVED" && (
                    <ActionButton action={moderateReviewAction} args={{ reviewId: r.id, status: "APPROVED", isFeatured: !r.isFeatured }} variant="ghost">
                      {r.isFeatured ? "Unfeature" : "Feature"}
                    </ActionButton>
                  )}
                  <ActionButton action={deleteReviewAction} args={r.id} variant="ghost" className="text-red-700" confirm={{ title: "Delete this review permanently?", destructive: true, confirmLabel: "Delete" }}>
                    Delete
                  </ActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
