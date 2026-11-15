import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { PaymentBadge, StatusBadge } from "@/components/dashboard/status-badge";
import { Badge, EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/primitives";
import { DateField, FilterBar, Pagination, SearchField, SelectField, buildHref } from "@/components/admin/filters";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { getSalonSettings } from "@/server/services/settings";
import { addDaysToDateKey, formatInTz, isValidDateKey, zonedToUtc } from "@/lib/time";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import type { AppointmentStatus, Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Bookings" };
const PAGE_SIZE = 20;

type SP = Promise<{ q?: string; status?: string; staff?: string; from?: string; to?: string; reschedule?: string; page?: string }>;

export default async function AdminBookingsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getSalonSettings();
  const tz = settings.timezone;
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const status = sp.status && sp.status in APPOINTMENT_STATUS_LABELS ? (sp.status as AppointmentStatus) : undefined;
  const from = sp.from && isValidDateKey(sp.from) ? sp.from : undefined;
  const to = sp.to && isValidDateKey(sp.to) ? sp.to : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.AppointmentWhereInput = {
    ...(status ? { status } : {}),
    ...(sp.staff ? { staffId: sp.staff } : {}),
    ...(sp.reschedule ? { rescheduleRequestedAt: { not: null }, status: { in: ["PENDING", "CONFIRMED"] } } : {}),
    ...(from || to
      ? { startAt: { ...(from ? { gte: zonedToUtc(from, 0, tz) } : {}), ...(to ? { lt: zonedToUtc(addDaysToDateKey(to, 1), 0, tz) } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q.toUpperCase() } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q.toLowerCase() } },
            { customerPhone: { contains: q.replace(/\s/g, "") } },
          ],
        }
      : {}),
  };

  const [total, items, staff] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startAt: from || status === "PENDING" || status === "CONFIRMED" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        customerName: true,
        customerPhone: true,
        startAt: true,
        status: true,
        paymentStatus: true,
        total: true,
        rescheduleRequestedAt: true,
        staff: { select: { user: { select: { name: true } } } },
        services: { select: { serviceName: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.staffProfile.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, user: { select: { name: true } } } }),
  ]);
  const pages = Math.ceil(total / PAGE_SIZE);
  const params = { q, status, staff: sp.staff, from, to, reschedule: sp.reschedule };

  return (
    <>
      <PageHeader title="Bookings" description={`${total} booking${total === 1 ? "" : "s"} found`} />
      <FilterBar action="/admin/bookings" resetHref="/admin/bookings">
        <SearchField defaultValue={q} placeholder="Reference, name, email or phone" />
        <SelectField name="status" label="Status" defaultValue={status} options={[["", "All statuses"], ...Object.entries(APPOINTMENT_STATUS_LABELS)]} />
        <SelectField name="staff" label="Professional" defaultValue={sp.staff} options={[["", "Everyone"], ...staff.map((s) => [s.id, s.user.name] as [string, string])]} />
        <DateField name="from" label="From" defaultValue={from} />
        <DateField name="to" label="To" defaultValue={to} />
      </FilterBar>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[
          ["Today", { from: formatInTz(new Date(), "yyyy-MM-dd", tz), to: formatInTz(new Date(), "yyyy-MM-dd", tz) }],
          ["Pending", { status: "PENDING" }],
          ["Reschedule requests", { reschedule: "1" }],
        ].map(([label, p]) => (
          <Link key={label as string} href={buildHref("/admin/bookings", p as Record<string, string>)} className="rounded-full border border-border bg-white px-3.5 py-1.5 hover:border-magenta hover:text-magenta">
            {label as string}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="No bookings match" description="Try adjusting the filters." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Reference</TH>
              <TH>Customer</TH>
              <TH>Services</TH>
              <TH>Date & time</TH>
              <TH>Professional</TH>
              <TH>Status</TH>
              <TH>Payment</TH>
              <TH className="text-right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {items.map((a) => (
              <TR key={a.id}>
                <TD>
                  <Link href={`/admin/bookings/${a.id}`} className="font-mono text-xs text-magenta hover:underline">
                    {a.reference}
                  </Link>
                </TD>
                <TD>
                  <span className="block">{a.customerName}</span>
                  <span className="text-xs text-muted-foreground">{a.customerPhone}</span>
                </TD>
                <TD className="max-w-52 truncate">{a.services.map((s) => s.serviceName).join(", ")}</TD>
                <TD className="whitespace-nowrap">{formatInTz(a.startAt, "EEE d MMM, h:mm a", tz)}</TD>
                <TD>{a.staff.user.name}</TD>
                <TD>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={a.status} />
                    {a.rescheduleRequestedAt && <Badge variant="info">Reschedule req.</Badge>}
                  </div>
                </TD>
                <TD>
                  <PaymentBadge status={a.paymentStatus} />
                </TD>
                <TD className="text-right">{formatINR(a.total)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pagination page={page} pages={pages} hrefFor={(p) => buildHref("/admin/bookings", { ...params, page: p })} />
    </>
  );
}
