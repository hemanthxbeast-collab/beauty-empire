import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <Logo />
      <p className="eyebrow mt-16">Error 404</p>
      <h1 className="heading-xl mt-4">Page not found</h1>
      <p className="lead mt-5 max-w-md">The page you are looking for may have moved or no longer exists.</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Return home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/services">Browse services</Link>
        </Button>
      </div>
    </main>
  );
}
