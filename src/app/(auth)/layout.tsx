import Image from "next/image";
import { Logo } from "@/components/site/logo";
import { IMG, unsplash } from "@/lib/images";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col bg-white px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Beauty Empire · Your data is protected and never shared.</p>
      </div>
      <div className="relative hidden overflow-hidden bg-charcoal lg:block">
        <Image src={unsplash(IMG.bride2, 1400)} alt="" fill priority sizes="50vw" className="object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/10 to-transparent" />
        <div className="absolute inset-x-12 bottom-14 text-white">
          <p className="eyebrow !text-rose">Beauty. Confidence. You.</p>
          <p className="mt-4 font-serif text-5xl leading-tight">
            Where beauty
            <br />
            meets <em className="text-rose">elegance.</em>
          </p>
        </div>
      </div>
    </main>
  );
}
