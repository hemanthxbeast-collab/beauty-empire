import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** GET-form filter bar: works without JavaScript, keeps filters in the URL (shareable, back-button friendly). */
export function FilterBar({ action, children, resetHref }: { action: string; children: React.ReactNode; resetHref: string }) {
  return (
    <form action={action} method="get" className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-white p-3 lg:flex-row lg:items-end">
      {children}
      <div className="flex gap-2">
        <Button type="submit" className="h-11">
          Apply
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href={resetHref}>Reset</Link>
        </Button>
      </div>
    </form>
  );
}

export function SearchField({ name = "q", defaultValue, placeholder, label = "Search" }: { name?: string; defaultValue?: string; placeholder?: string; label?: string }) {
  return (
    <label className="relative flex-1">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Search aria-hidden className="pointer-events-none absolute bottom-3.5 left-3.5 size-4 text-muted-rose" />
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-input pr-3 pl-10 text-sm focus-visible:border-magenta focus-visible:ring-4 focus-visible:ring-magenta/10 focus-visible:outline-none"
      />
    </label>
  );
}

export function SelectField({ name, label, defaultValue, options, className }: { name: string; label: string; defaultValue?: string; options: Array<[string, string]>; className?: string }) {
  return (
    <label className={cn("lg:w-48", className)}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm focus-visible:border-magenta focus-visible:outline-none">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DateField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="lg:w-44">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input type="date" name={name} defaultValue={defaultValue} className="h-11 w-full rounded-xl border border-input px-3 text-sm focus-visible:border-magenta focus-visible:outline-none" />
    </label>
  );
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" className={cn(page <= 1 && "pointer-events-none opacity-40")}>
          <Link href={hrefFor(page - 1)} aria-disabled={page <= 1}>
            Previous
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className={cn(page >= pages && "pointer-events-none opacity-40")}>
          <Link href={hrefFor(page + 1)} aria-disabled={page >= pages}>
            Next
          </Link>
        </Button>
      </div>
    </nav>
  );
}

export function buildHref(base: string, params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}
