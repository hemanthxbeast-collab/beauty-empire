import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";

export const metadata = { title: "Access denied", robots: { index: false } };

export default function ForbiddenPage() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <Logo />
      <ShieldAlert className="mt-16 size-10 text-magenta" aria-hidden />
      <h1 className="heading-lg mt-4">Access denied</h1>
      <p className="lead mt-4 max-w-md">You don&apos;t have permission to view this page.</p>
      <Button asChild className="mt-10">
        <Link href="/">Return home</Link>
      </Button>
    </main>
  );
}
