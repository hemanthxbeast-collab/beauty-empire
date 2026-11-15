"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Clock,
  CreditCard,
  FolderTree,
  Home,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareHeart,
  Scissors,
  Settings,
  Star,
  Tag,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { authClient } from "@/lib/auth-client";
import { cn, initials } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  calendarCheck: CalendarCheck,
  calendarClock: CalendarClock,
  clock: Clock,
  user: User,
  users: Users,
  team: UsersRound,
  star: Star,
  reviews: MessageSquareHeart,
  services: Scissors,
  categories: FolderTree,
  gallery: Images,
  offers: Tag,
  payments: CreditCard,
  settings: Settings,
  bell: Bell,
  home: Home,
} satisfies Record<string, LucideIcon>;

export type ShellNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; exact?: boolean };

export function DashboardShell({
  title,
  nav,
  user,
  children,
  unread = 0,
}: {
  title: string;
  nav: ShellNavItem[];
  user: { name: string; email: string; roleLabel: string };
  children: React.ReactNode;
  unread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isActive = (item: ShellNavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));

  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavList = (
    <nav aria-label={`${title} navigation`} className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
              active ? "bg-magenta text-white shadow-[0_8px_20px_-10px_rgba(194,24,112,0.6)]" : "text-charcoal/75 hover:bg-blush hover:text-magenta-deep",
            )}
          >
            <Icon className="size-4.5" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", active ? "bg-white/20" : "bg-magenta text-white")}>{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const UserCard = (
    <div className="rounded-2xl border border-border bg-ivory p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blush font-serif text-magenta-deep">{initials(user.name)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-charcoal">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.roleLabel}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={logout}>
        <LogOut /> Sign out
      </Button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-soft-grey/60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-68 flex-col border-r border-border bg-white px-5 py-6 lg:flex">
        <Logo />
        <p className="mt-8 mb-3 px-3.5 text-[0.65rem] font-semibold tracking-[0.2em] text-muted-rose uppercase">{title}</p>
        <div className="flex-1 overflow-y-auto">{NavList}</div>
        <Link href="/" className="mb-3 flex items-center gap-2 px-3.5 text-xs text-muted-foreground hover:text-magenta">
          <Home className="size-3.5" /> Back to website
        </Link>
        {UserCard}
      </aside>

      <div className="lg:pl-68">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/90 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="size-5" />
                </Button>
              </DialogTrigger>
              <DialogContent side="right" aria-describedby={undefined} className="left-0 right-auto data-[state=open]:slide-in-from-left">
                <DialogTitle className="sr-only">{title} navigation</DialogTitle>
                <Logo />
                <div className="mt-8 flex-1 overflow-y-auto">{NavList}</div>
                <div className="pt-4">{UserCard}</div>
              </DialogContent>
            </Dialog>
            <p className="font-serif text-lg text-charcoal">{title}</p>
          </div>
          <Link
            href={nav.find((n) => n.icon === "bell")?.href ?? "#"}
            className="relative rounded-full p-2 text-charcoal/70 hover:bg-blush hover:text-magenta"
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          >
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-magenta text-[0.6rem] text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
        </header>
        <main id="main" className="px-5 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl text-charcoal sm:text-4xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", accent ? "border-magenta bg-magenta text-white" : "border-border bg-white")}>
      <p className={cn("text-[0.68rem] font-semibold tracking-[0.15em] uppercase", accent ? "text-white/75" : "text-muted-rose")}>{label}</p>
      <p className={cn("mt-2 font-serif text-2xl break-words sm:text-3xl", accent ? "text-white" : "text-charcoal")}>{value}</p>
      {hint && <p className={cn("mt-1 text-xs", accent ? "text-white/70" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
