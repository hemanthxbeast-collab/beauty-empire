"use client";

import { usePathname } from "next/navigation";
import { WhatsappIcon } from "./icons";

export function WhatsappFloat({ href }: { href: string }) {
  const pathname = usePathname();
  // Hidden in the booking wizard, where it would cover the mobile action bar.
  if (pathname.startsWith("/book")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-whatsapp p-3 text-white shadow-[0_14px_34px_-12px_rgba(23,122,67,0.6)] transition-all hover:pr-5 hover:pl-4 sm:right-7 sm:bottom-7"
    >
      <WhatsappIcon className="size-6" aria-hidden />
      <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover:max-w-40 group-focus-visible:max-w-40">Chat on WhatsApp</span>
    </a>
  );
}
