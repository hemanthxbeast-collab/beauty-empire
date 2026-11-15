import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full min-w-0 rounded-xl border border-input bg-white px-4 text-[0.95rem] text-charcoal shadow-[inset_0_1px_2px_rgba(41,35,41,0.03)] transition-colors placeholder:text-muted-foreground/70 focus-visible:border-magenta focus-visible:ring-4 focus-visible:ring-magenta/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/10";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-12", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select data-slot="select" className={cn(fieldBase, "h-12 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-rose" />
    </div>
  );
}

function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn("size-4.5 shrink-0 cursor-pointer rounded border-input accent-magenta focus-visible:ring-2 focus-visible:ring-magenta", className)}
      {...props}
    />
  );
}

export { Input, Textarea, NativeSelect, Checkbox };
