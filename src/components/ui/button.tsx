import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-magenta focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-magenta text-white shadow-[0_10px_30px_-12px_rgba(194,24,112,0.65)] hover:-translate-y-0.5 hover:bg-magenta-deep hover:shadow-[0_16px_36px_-14px_rgba(157,20,90,0.7)] active:translate-y-0",
        outline: "border border-charcoal/15 bg-white/70 text-charcoal backdrop-blur hover:border-magenta hover:text-magenta",
        secondary: "bg-blush text-magenta-deep hover:bg-rose/60",
        ghost: "text-charcoal hover:bg-blush hover:text-magenta-deep",
        link: "rounded-none px-0 text-magenta underline-offset-4 hover:underline",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        dark: "bg-charcoal text-white hover:bg-black",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[0.8rem]",
        lg: "h-13 px-8 text-[0.95rem]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
