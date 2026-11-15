"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="flex min-h-[70dvh] flex-col items-center justify-center bg-ivory px-6 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="heading-lg mt-4">We hit an unexpected snag</h1>
      <p className="lead mt-4 max-w-md">Please try again. If the problem continues, contact the salon and we&apos;ll help right away.</p>
      {error.digest && <p className="mt-3 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
