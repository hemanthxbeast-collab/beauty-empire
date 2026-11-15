"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarHeart, LayoutDashboard, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dialog";
import { Logo } from "./logo";
import { NAV_LINKS } from "@/lib/constants";
import { authClient } from "@/lib/auth-client";
import { cn, initials } from "@/lib/utils";

type NavUser = { name: string; role: "CUSTOMER" | "STAFF" | "ADMIN" } | null;

function dashboardFor(role: NonNullable<NavUser>["role"]) {
  return role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/account";
}

export function Navbar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-500",
        scrolled ? "border-b border-border/70 bg-white/85 shadow-[0_8px_30px_-20px_rgba(157,20,90,0.25)] backdrop-blur-md" : "bg-ivory",
      )}
    >
      <div className={cn("container-lux flex items-center justify-between gap-6 transition-all duration-500", scrolled ? "h-[4.5rem]" : "h-20 lg:h-24")}>
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3.5 py-2 text-[0.84rem] font-medium tracking-wide text-charcoal/80 transition-colors hover:text-magenta",
                "after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-magenta after:transition-transform after:duration-300 hover:after:scale-x-100",
                isActive(l.href) && "text-magenta after:scale-x-100",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden items-center gap-2 rounded-full border border-border bg-white py-1 pr-3 pl-1 text-sm transition hover:border-rose sm:flex"
                  aria-label="Account menu"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-blush font-serif text-sm text-magenta-deep">{initials(user.name)}</span>
                  <span className="max-w-28 truncate text-charcoal/80">{user.name.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Signed in as {user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push(dashboardFor(user.role))}>
                  <LayoutDashboard /> {user.role === "CUSTOMER" ? "My account" : "Dashboard"}
                </DropdownMenuItem>
                {user.role === "CUSTOMER" && (
                  <>
                    <DropdownMenuItem onSelect={() => router.push("/account/appointments")}>
                      <CalendarHeart /> My appointments
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push("/account/profile")}>
                      <User /> Profile
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="hidden px-3 text-[0.84rem] font-medium text-charcoal/80 transition-colors hover:text-magenta sm:inline">
              Login / Sign Up
            </Link>
          )}
          <Button asChild size="sm" className="hidden h-10 px-5 sm:inline-flex">
            <Link href="/book">Book Appointment</Link>
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </DialogTrigger>
            <DialogContent side="right" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Menu</DialogTitle>
              <Logo />
              <nav aria-label="Mobile" className="mt-10 flex flex-col">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={cn(
                      "border-b border-border/70 py-3.5 font-serif text-2xl text-charcoal transition-colors hover:text-magenta",
                      isActive(l.href) && "text-magenta",
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto space-y-3 pt-8">
                <Button asChild className="w-full" size="lg">
                  <Link href="/book">Book Appointment</Link>
                </Button>
                {user ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button asChild variant="outline">
                      <Link href={dashboardFor(user.role)}>{user.role === "CUSTOMER" ? "My account" : "Dashboard"}</Link>
                    </Button>
                    <Button variant="outline" onClick={logout}>
                      Sign out
                    </Button>
                  </div>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login">Login / Sign Up</Link>
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
