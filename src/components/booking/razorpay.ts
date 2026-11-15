"use client";

type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void };
  }
}

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay Checkout"));
    document.body.appendChild(s);
  });
}

export type PaymentOutcome = "PAID" | "FAILED" | "DISMISSED";

/**
 * Creates a server-side order, opens Razorpay Checkout and sends the result to the server
 * for signature verification. Payment success is never assumed on the client.
 */
export async function payWithRazorpay(params: { appointmentId: string; token?: string }): Promise<{ outcome: PaymentOutcome; message?: string }> {
  const orderRes = await fetch("/api/payments/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const order = (await orderRes.json()) as RazorpayOrder & { error?: string };
  if (!orderRes.ok) return { outcome: "FAILED", message: order.error ?? "Could not start payment." };

  await loadScript();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: { outcome: PaymentOutcome; message?: string }) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#C21870" },
      handler: async (resp: RazorpaySuccess) => {
        const verify = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...params, ...resp }),
        });
        const body = (await verify.json().catch(() => ({}))) as { error?: string };
        finish(verify.ok ? { outcome: "PAID" } : { outcome: "FAILED", message: body.error ?? "Payment could not be verified." });
      },
      modal: { ondismiss: () => finish({ outcome: "DISMISSED" }) },
    });
    rzp.on("payment.failed", async (resp) => {
      await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, failed: true, razorpay_order_id: order.orderId, reason: resp.error?.description?.slice(0, 300) }),
      }).catch(() => undefined);
      finish({ outcome: "FAILED", message: resp.error?.description ?? "Payment failed." });
    });
    rzp.open();
  });
}
