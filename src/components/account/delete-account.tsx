"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/primitives";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-200 text-red-700 hover:border-red-400 hover:text-red-800">
          <Trash2 /> Delete my account
        </Button>
      </DialogTrigger>
      <DialogContent role="alertdialog">
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogDescription>
          This permanently deletes your login, profile, preferences, reviews and notifications. Past booking records are kept for the salon&apos;s accounts
          with your name, email and phone removed. This cannot be undone.
        </DialogDescription>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <Field label="Confirm with your password" htmlFor="del-password" className="mt-5">
          <PasswordInput id="del-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep my account
          </Button>
          <Button
            variant="destructive"
            disabled={!password || pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              const { error: e } = await authClient.deleteUser({ password });
              setPending(false);
              if (e) {
                setError(e.code === "INVALID_PASSWORD" ? "That password is incorrect." : (e.message ?? "Could not delete the account."));
                return;
              }
              router.push("/?account=deleted");
              router.refresh();
            }}
          >
            {pending && <Loader2 className="animate-spin" />} Delete permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
