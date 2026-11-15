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
      aria-label="Chat with us on WhatsApp"
      className="group fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-[#1f9d55] p-3 text-white shadow-[0_14px_34px_-12px_rgba(31,157,85,0.7)] transition-all hover:pr-5 hover:pl-4 sm:right-7 sm:bottom-7"
    >
      <WhatsappIcon className="size-6" />
      <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 group-hover:max-w-40">Chat on WhatsApp</span>
    </a>
  );
}
