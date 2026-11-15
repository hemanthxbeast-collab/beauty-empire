import Link from "next/link";
import { CreditCard } from "lucide-react";
import { EmptyState, Table, TBody, TD, TH, THead, TR, Badge } from "@/components/ui/primitives";
import { PageHeader, StatCard } from "@/components/dashboard/shell";
import { PaymentBadge } from "@/components/dashboard/status-badge";
import { FilterBar, Pagination, SelectField, buildHref } from "@/components/admin/filters";
import { requireAdmin } from "@/server/session";
import { prisma } from "@/server/db";
import { integrations } from "@/server/env";
import { getSalonSettings } from "@/server/services/settings";
import { formatInTz } from "@/lib/time";
import { formatINR } from "@/lib/utils";
import type { PaymentStatus, Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Payments" };
const PAGE_SIZE = 25;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; method?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getSalonSettings();
  const status = ["PENDING", "PAID", "FAILED", "REFUNDED"].includes(sp.status ?? "") ? (sp.status as PaymentStatus) : undefined;
  const method = sp.method === "RAZORPAY" || sp.method === "PAY_AT_SALON" ? sp.method : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.PaymentWhereInput = { ...(status ? { status } : {}), ...(method ? { method } : {}) };

  const [total, payments, paid, refunded, online] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { appointment: { select: { id: true, reference: true, customerName: true } } },
    }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { status: "REFUNDED" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "PAID", method: "RAZORPAY" }, _sum: { amount: true } }),
  ]);

  return (
    <>
      <PageHeader title="Payments" description="Verified online payments and payments recorded at the salon." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Collected" value={formatINR(paid._sum.amount ?? 0)} hint={`${paid._count._all} payments`} accent />
        <StatCard label="Online (Razorpay)" value={formatINR(online._sum.amount ?? 0)} />
        <StatCard label="Refunded" value={formatINR(refunded._sum.amount ?? 0)} />
        <StatCard label="Online payments" value={integrations.razorpay ? (settings.onlinePaymentsEnabled ? "Enabled" : "Disabled") : "Not configured"} hint={integrations.razorpay ? "Toggle in Settings" : "Add Razorpay keys to enable"} />
      </div>
      <FilterBar action="/admin/payments" resetHref="/admin/payments">
        <SelectField name="status" label="Status" defaultValue={status} options={[["", "Any status"], ["PAID", "Paid"], ["PENDING", "Pending"], ["FAILED", "Failed"], ["REFUNDED", "Refunded"]]} />
        <SelectField name="method" label="Method" defaultValue={method} options={[["", "Any method"], ["RAZORPAY", "Razorpay"], ["PAY_AT_SALON", "At salon"]]} />
      </FilterBar>
      {payments.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-5" />} title="No payments found" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Booking</TH>
              <TH>Customer</TH>
              <TH>Method</TH>
              <TH>Reference</TH>
              <TH>Status</TH>
              <TH className="text-right">Amount</TH>
            </TR>
          </THead>
          <TBody>
            {payments.map((p) => (
              <TR key={p.id}>
                <TD className="whitespace-nowrap">{formatInTz(p.paidAt ?? p.createdAt, "d MMM yyyy, h:mm a", settings.timezone)}</TD>
                <TD>
                  <Link href={`/admin/bookings/${p.appointment.id}`} className="font-mono text-xs text-magenta hover:underline">
                    {p.appointment.reference}
                  </Link>
                </TD>
                <TD>{p.appointment.customerName}</TD>
                <TD>
                  <Badge variant="outline">{p.method === "RAZORPAY" ? "Razorpay" : "At salon"}</Badge>
                </TD>
                <TD className="font-mono text-xs text-muted-foreground">{p.razorpayPaymentId ?? p.razorpayOrderId ?? "—"}</TD>
                <TD>
                  <PaymentBadge status={p.status} />
                </TD>
                <TD className="text-right">{formatINR(p.amount, { decimals: true })}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <Pagination page={page} pages={Math.ceil(total / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/payments", { status, method, page: n })} />
    </>
  );
}
