"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { ActionResult } from "@/server/errors";

type Variant = React.ComponentProps<typeof Button>["variant"];
type Size = React.ComponentProps<typeof Button>["size"];

/**
 * Invokes a server action, shows a toast with the result and refreshes the page.
 * With `confirm`, an accessible confirmation dialog is shown first.
 */
export function ActionButton<T>({
  action,
  args,
  children,
  variant,
  size = "sm",
  className,
  confirm,
  successMessage,
  disabled,
}: {
  action: (input: T) => Promise<ActionResult<unknown>>;
  args?: T;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  confirm?: { title: string; description?: string; confirmLabel?: string; destructive?: boolean };
  successMessage?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = () =>
    new Promise<void>((resolve) => {
      start(async () => {
        const res = await action(args as T);
        if (res.ok) {
          toast.success(res.message ?? successMessage ?? "Saved");
          router.refresh();
        } else toast.error(res.error);
        resolve();
      });
    });

  const button = (
    <Button variant={variant} size={size} className={className} disabled={pending || disabled} onClick={confirm ? undefined : run}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );

  if (confirm) {
    return (
      <ConfirmDialog trigger={button} title={confirm.title} description={confirm.description} confirmLabel={confirm.confirmLabel} destructive={confirm.destructive} onConfirm={run} />
    );
  }
  return button;
}
