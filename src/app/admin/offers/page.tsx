import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Table, TBody, TD, TH, THead, TR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { deleteOfferAction, toggleOfferAction } from "@/server/actions/admin-catalog";
import { dateKeyInTz, dbDateToDateKey } from "@/lib/time";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Offers" };

export default async function AdminOffersPage() {
  await requireAdmin();
  const settings = await getSalonSettings();
  const today = dateKeyInTz(new Date(), settings.timezone);
  const offers = await prisma.offer.findMany({ orderBy: [{ isActive: "desc" }, { validUntil: "desc" }], include: { _count: { select: { appointments: true, services: true } } } });
  return (
    <>
      <PageHeader
        title="Offers"
        description="Active offers within their validity dates appear on the website and apply discounts at booking."
        actions={
          <Button asChild>
            <Link href="/admin/offers/new">
              <Plus /> New offer
            </Link>
          </Button>
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>Offer</TH>
            <TH>Discount</TH>
            <TH>Price</TH>
            <TH>Validity</TH>
            <TH>Bookings</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {offers.map((o) => {
            const from = dbDateToDateKey(o.validFrom);
            const until = dbDateToDateKey(o.validUntil);
            const state = !o.isActive ? "Inactive" : until < today ? "Expired" : from > today ? "Scheduled" : "Live";
            return (
              <TR key={o.id}>
                <TD>
                  <Link href={`/admin/offers/${o.id}`} className="font-medium hover:text-magenta">
                    {o.title}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{o._count.services ? `${o._count.services} service(s)` : "All services"}</span>
                </TD>
                <TD>{o.discountPercent}%</TD>
                <TD className="whitespace-nowrap">
                  {formatINR(o.discountedPrice)} <s className="text-xs text-muted-foreground">{formatINR(o.originalPrice)}</s>
                </TD>
                <TD className="text-xs whitespace-nowrap">
                  {from} → {until}
                </TD>
                <TD>{o._count.appointments}</TD>
                <TD>
                  <Badge variant={state === "Live" ? "success" : state === "Scheduled" ? "info" : "neutral"}>{state}</Badge>
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/offers/${o.id}`}>Edit</Link>
                    </Button>
                    <ActionButton action={toggleOfferAction} args={{ id: o.id, isActive: !o.isActive }} variant="ghost">
                      {o.isActive ? "Deactivate" : "Activate"}
                    </ActionButton>
                    <ActionButton action={deleteOfferAction} args={o.id} variant="ghost" className="text-red-700" confirm={{ title: `Delete “${o.title}”?`, description: "Past bookings keep their discount record.", destructive: true, confirmLabel: "Delete" }}>
                      Delete
                    </ActionButton>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </>
  );
}
