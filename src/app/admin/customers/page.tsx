import Link from "next/link";
import { Mail, Users } from "lucide-react";
import { Badge, EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/primitives";
import { PageHeader } from "@/components/dashboard/shell";
import { ActionButton } from "@/components/dashboard/action-button";
import { FilterBar, Pagination, SearchField, buildHref } from "@/components/admin/filters";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { setContactStatusAction } from "@/server/actions/admin-ops";
import { formatInTz } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Customers" };
const PAGE_SIZE = 25;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getSalonSettings();
  const tab = sp.tab === "messages" ? "messages" : "customers";
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const tabs = (
    <div role="tablist" className="mb-6 inline-flex rounded-full border border-border bg-white p-1">
      {(["customers", "messages"] as const).map((t) => (
        <Link
          key={t}
          role="tab"
          aria-selected={tab === t}
          href={t === "messages" ? "/admin/customers?tab=messages" : "/admin/customers"}
          className={cn("rounded-full px-5 py-2 text-sm capitalize transition", tab === t ? "bg-magenta text-white" : "text-charcoal/70 hover:text-magenta")}
        >
          {t === "messages" ? "Enquiry messages" : "Customers"}
        </Link>
      ))}
    </div>
  );

  if (tab === "messages") {
    const messages = await prisma.contactMessage.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 });
    return (
      <>
        <PageHeader title="Customers & messages" />
        {tabs}
        {messages.length === 0 ? (
          <EmptyState icon={<Mail className="size-5" />} title="No messages" description="Contact form enquiries will appear here." />
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className={cn("rounded-2xl border bg-white p-5", m.status === "NEW" ? "border-rose" : "border-border")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-charcoal">{m.subject}</p>
                      <Badge variant={m.status === "NEW" ? "warning" : m.status === "RESOLVED" ? "success" : "neutral"}>{m.status.toLowerCase()}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-rose">
                      {m.name} ·{" "}
                      <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="hover:text-magenta">
                        {m.email}
                      </a>
                      {m.phone && ` · ${m.phone}`} · {formatInTz(m.createdAt, "d MMM yyyy, h:mm a", settings.timezone)}
                    </p>
                    <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">{m.message}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {m.status === "NEW" && (
                      <ActionButton action={setContactStatusAction} args={{ id: m.id, status: "READ" }} variant="ghost">
                        Mark read
                      </ActionButton>
                    )}
                    {m.status !== "RESOLVED" && (
                      <ActionButton action={setContactStatusAction} args={{ id: m.id, status: "RESOLVED" }} variant="outline">
                        Resolve
                      </ActionButton>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q.toLowerCase() } }, { phone: { contains: q.replace(/\s/g, "") } }] } : {}),
  };
  const [total, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        customerProfile: { select: { _count: { select: { appointments: true, reviews: true } } } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title="Customers & messages" description={`${total} customer account${total === 1 ? "" : "s"}`} />
      {tabs}
      <FilterBar action="/admin/customers" resetHref="/admin/customers">
        <SearchField defaultValue={q} placeholder="Name, email or phone" />
      </FilterBar>
      {customers.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title="No customers found" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH>Phone</TH>
              <TH>Bookings</TH>
              <TH>Reviews</TH>
              <TH>Joined</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {customers.map((c) => (
              <TR key={c.id}>
                <TD>
                  <Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-magenta">
                    {c.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{c.email}</span>
                </TD>
                <TD>{c.phone ?? "—"}</TD>
                <TD>{c.customerProfile?._count.appointments ?? 0}</TD>
                <TD>{c.customerProfile?._count.reviews ?? 0}</TD>
                <TD className="whitespace-nowrap">{formatInTz(c.createdAt, "d MMM yyyy", settings.timezone)}</TD>
                <TD>
                  <div className="flex gap-1">
                    {!c.isActive && <Badge variant="danger">Disabled</Badge>}
                    {c.isActive && <Badge variant={c.emailVerified ? "success" : "warning"}>{c.emailVerified ? "Verified" : "Unverified"}</Badge>}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} hrefFor={(p) => buildHref("/admin/customers", { q, page: p })} />
    </>
  );
}
