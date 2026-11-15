import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Animations are pure CSS so content is never hidden behind JavaScript hydration:
 * - FadeIn: plays once on first paint (hero).
 * - Reveal: scroll-driven (`animation-timeline: view()`) where supported; elsewhere content
 *   is simply visible. Both are disabled for prefers-reduced-motion (see globals.css).
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <div className={cn("reveal", className)} style={delay ? ({ "--reveal-delay": `${delay * 40}%` } as CSSProperties) : undefined}>
      {children}
    </div>
  );
}

export function FadeIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={cn("fade-in-up", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}
