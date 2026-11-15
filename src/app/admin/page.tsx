import Link from "next/link";
import { AlertCircle, ArrowRight, CalendarClock, MessageSquare, Star } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardHeader, CardTitle, Table, TBody, TD, TH, THead, TR } from "@/components/ui/primitives";
import { ColumnChart, RankedBars, TrendChart } from "@/components/admin/charts";
import { requireAdmin } from "@/server/session";
import { getSalonSettings } from "@/server/services/settings";
import { getDashboardData } from "@/server/queries/admin";
import { formatInTz } from "@/lib/time";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  await requireAdmin();
  const settings = await getSalonSettings();
  const d = await getDashboardData(settings.timezone);
  const alerts = [
    d.stats.pending && { href: "/admin/bookings?status=PENDING", icon: AlertCircle, text: `${d.stats.pending} booking(s) awaiting confirmation` },
    d.stats.pendingReschedules && { href: "/admin/bookings?reschedule=1", icon: CalendarClock, text: `${d.stats.pendingReschedules} reschedule request(s)` },
    d.stats.pendingReviews && { href: "/admin/reviews?status=PENDING", icon: Star, text: `${d.stats.pendingReviews} review(s) to moderate` },
    d.stats.newMessages && { href: "/admin/customers?tab=messages", icon: MessageSquare, text: `${d.stats.newMessages} new enquiry message(s)` },
  ].filter(Boolean) as Array<{ href: string; icon: typeof AlertCircle; text: string }>;

  return (
    <>
      <PageHeader title="Dashboard" description={`Today is ${formatInTz(new Date(), "EEEE, d MMMM yyyy", settings.timezone)}`} />

      {alerts.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {alerts.map(({ href, icon: Icon, text }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-2xl border border-rose bg-blush/50 px-4 py-3 text-sm text-magenta-deep transition hover:bg-blush">
              <Icon className="size-4 shrink-0" aria-hidden /> <span className="flex-1">{text}</span> <ArrowRight className="size-4" aria-hidden />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Today's appointments" value={d.stats.today} accent />
        <StatCard label="Pending bookings" value={d.stats.pending} />
        <StatCard label="Confirmed bookings" value={d.stats.confirmed} />
        <StatCard label="Completed" value={d.stats.completed} />
        <StatCard label="Total appointments" value={d.stats.total} />
        <StatCard label="Customers" value={d.stats.customers} />
        <StatCard label="Revenue collected" value={formatINR(d.stats.revenue)} hint="All verified payments" />
        <StatCard label="Reviews to moderate" value={d.stats.pendingReviews} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly appointments</CardTitle>
            <p className="text-xs text-muted-foreground">Active & completed appointments per week, last 8 weeks</p>
          </CardHeader>
          <CardContent>
            <ColumnChart data={d.weekly} unit="appointments" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue</CardTitle>
            <p className="text-xs text-muted-foreground">Verified payments (INR), last 6 months</p>
          </CardHeader>
          <CardContent>
            <ColumnChart data={d.monthly} money />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Booking trend</CardTitle>
            <p className="text-xs text-muted-foreground">New bookings created per day, last 30 days</p>
          </CardHeader>
          <CardContent>
            <TrendChart data={d.trend} unit="bookings" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Service popularity</CardTitle>
            <p className="text-xs text-muted-foreground">Most booked services, last 6 months</p>
          </CardHeader>
          <CardContent>
            <RankedBars data={d.popular} unit="bookings" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-charcoal">Recent bookings</h2>
          <Link href="/admin/bookings" className="flex items-center gap-1 text-sm text-magenta hover:underline">
            All bookings <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Reference</TH>
              <TH>Customer</TH>
              <TH>Services</TH>
              <TH>When</TH>
              <TH>Professional</TH>
              <TH>Status</TH>
              <TH className="text-right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {d.recent.map((a) => (
              <TR key={a.id}>
                <TD>
                  <Link href={`/admin/bookings/${a.id}`} className="font-mono text-xs text-magenta hover:underline">
                    {a.reference}
                  </Link>
                </TD>
                <TD>{a.customerName}</TD>
                <TD className="max-w-56 truncate">{a.services.map((s) => s.serviceName).join(", ")}</TD>
                <TD className="whitespace-nowrap">{formatInTz(a.startAt, "d MMM, h:mm a", settings.timezone)}</TD>
                <TD>{a.staff.user.name}</TD>
                <TD>
                  <StatusBadge status={a.status} />
                </TD>
                <TD className="text-right">{formatINR(a.total)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
