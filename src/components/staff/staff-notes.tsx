"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { saveStaffNotesAction } from "@/server/actions/staff";

export function StaffNotes({ appointmentId, initial }: { appointmentId: string; initial: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs text-magenta hover:underline">
        {initial ? `Progress notes: “${initial.slice(0, 60)}${initial.length > 60 ? "…" : ""}” · edit` : "+ Add progress notes"}
      </button>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <label htmlFor={`notes-${appointmentId}`} className="text-xs font-medium text-charcoal">
        Progress notes (visible to staff & admin)
      </label>
      <Textarea id={`notes-${appointmentId}`} rows={3} maxLength={1000} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const res = await saveStaffNotesAction({ appointmentId, staffNotes: value });
            setPending(false);
            if (res.ok) {
              toast.success("Notes saved");
              setOpen(false);
            } else toast.error(res.error);
          }}
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
