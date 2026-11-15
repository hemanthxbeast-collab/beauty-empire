import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" aria-label="Beauty Empire — home" className={cn("group inline-flex flex-col leading-none", className)}>
      <span className={cn("font-serif text-[1.55rem] tracking-[0.02em] sm:text-[1.7rem]", light ? "text-white" : "text-charcoal")}>
        Beauty <em className="text-magenta not-italic transition-colors group-hover:text-magenta-deep">Empire</em>
      </span>
      <span className={cn("mt-1 text-[0.55rem] font-semibold tracking-[0.42em] uppercase", light ? "text-rose" : "text-muted-rose")}>
        Salon · Bridal Studio
      </span>
    </Link>
  );
}
