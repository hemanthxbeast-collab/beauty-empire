"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { payWithRazorpay } from "./razorpay";

export function PayNowButton({ appointmentId, token, amount }: { appointmentId: string; token?: string; amount: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const res = await payWithRazorpay({ appointmentId, token });
          if (res.outcome === "PAID") toast.success("Payment verified. Thank you!");
          else if (res.outcome === "FAILED") toast.error(res.message ?? "Payment failed.");
          router.refresh();
        } catch {
          toast.error("Could not open the payment window. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <CreditCard />} Pay {amount} now
    </Button>
  );
}
