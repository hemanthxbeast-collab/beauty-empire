import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ── Card ──
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card" className={cn("rounded-2xl border border-border bg-card text-card-foreground shadow-soft", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-6 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-serif text-xl leading-tight text-charcoal", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-3", className)} {...props} />;
}

// ── Badge ──
export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide whitespace-nowrap", {
  variants: {
    variant: {
      default: "bg-blush text-magenta-deep",
      outline: "border border-border text-muted-foreground",
      success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15",
      warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
      danger: "bg-red-50 text-red-700 ring-1 ring-red-600/15",
      info: "bg-sky-50 text-sky-700 ring-1 ring-sky-600/15",
      neutral: "bg-soft-grey text-charcoal/70",
      dark: "bg-charcoal text-white",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ── Separator / Skeleton ──
export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-border", className)} />;
}
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

// ── Table ──
export function Table({ className, label = "Table", ...props }: React.ComponentProps<"table"> & { label?: string }) {
  return (
    // Focusable so keyboard users can scroll wide tables on small screens (WCAG 2.1.1).
    <div role="region" aria-label={label} tabIndex={0} className="relative w-full overflow-x-auto rounded-2xl border border-border bg-white focus-visible:outline-2 focus-visible:outline-magenta">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("bg-ivory [&_tr]:border-b", className)} {...props} />;
}
export function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}
export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-ivory/60", className)} {...props} />;
}
export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("h-11 px-4 text-left align-middle text-[0.68rem] font-semibold tracking-[0.12em] whitespace-nowrap text-muted-rose uppercase", className)}
      {...props}
    />
  );
}
export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}

// ── Field wrapper with accessible error ──
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-charcoal">
        {label}
        {required && <span className="ml-0.5 text-magenta" aria-hidden>*</span>}
      </label>
      {linkDescription(children, htmlFor, error, hint)}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[0.8rem] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[0.8rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Adds aria-describedby / aria-invalid to the field's control so errors and hints are announced. */
function linkDescription(children: React.ReactNode, id: string, error?: string, hint?: string) {
  if (!error && !hint) return children;
  const link = (el: React.ReactElement<Record<string, unknown>>) =>
    React.cloneElement(el, {
      "aria-describedby": [el.props["aria-describedby"], error ? `${id}-error` : `${id}-hint`].filter(Boolean).join(" "),
      ...(error ? { "aria-invalid": true } : {}),
    });
  if (React.isValidElement(children)) return link(children as React.ReactElement<Record<string, unknown>>);
  // Several children (e.g. password input + strength meter): link the first element, which is the control.
  let done = false;
  return React.Children.map(children, (child) => {
    if (!done && React.isValidElement(child)) {
      done = true;
      return link(child as React.ReactElement<Record<string, unknown>>);
    }
    return child;
  });
}

// ── Empty state ──
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose/70 bg-ivory/60 px-6 py-14 text-center">
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-blush text-magenta">{icon}</div>}
      <h3 className="font-serif text-xl text-charcoal">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
