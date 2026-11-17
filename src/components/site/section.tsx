import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Reveal className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className={align === "left" ? "max-w-2xl" : undefined}>
        {eyebrow && (
          <p className={cn("eyebrow flex items-center gap-3", align === "center" && "justify-center")}>
            <span aria-hidden className="h-px w-8 bg-magenta/50" />
            {eyebrow}
            {align === "center" && <span aria-hidden className="h-px w-8 bg-magenta/50" />}
          </p>
        )}
        <h2 className="heading-lg mt-4 text-balance">{title}</h2>
        {description && <p className="lead mt-5 text-pretty">{description}</p>}
      </div>
      {action}
    </Reveal>
  );
}

export function PageHero({ eyebrow, title, description, image, children }: { eyebrow: string; title: ReactNode; description?: ReactNode; image?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ivory">
      <div className={cn("container-lux relative grid items-center gap-10 py-16 lg:py-24", image && "lg:grid-cols-[1.1fr_0.9fr]")}>
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="heading-xl mt-5 text-balance">{title}</h1>
          {description && <p className="lead mt-6 max-w-xl text-pretty">{description}</p>}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
        {image && (
          <Reveal delay={0.15} className="relative hidden lg:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
              <Image src={image} alt="" fill priority sizes="(min-width: 1024px) 40vw, 0px" className="object-cover" />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
