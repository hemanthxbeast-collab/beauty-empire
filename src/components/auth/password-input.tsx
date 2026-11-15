"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className="pr-12" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1.5 text-muted-rose hover:text-magenta"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

const RULES: Array<[RegExp, string]> = [
  [/.{8,}/, "8+ characters"],
  [/[A-Z]/, "Uppercase"],
  [/[a-z]/, "Lowercase"],
  [/\d/, "Number"],
  [/[^A-Za-z0-9]/, "Symbol"],
];

export function PasswordStrength({ value }: { value: string }) {
  const passed = RULES.filter(([re]) => re.test(value)).length;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {RULES.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passed ? (passed >= 5 ? "bg-emerald-500" : passed >= 3 ? "bg-amber-400" : "bg-magenta") : "bg-soft-grey"}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem]">
        {RULES.map(([re, label]) => (
          <li key={label} className={re.test(value) ? "text-emerald-600" : "text-muted-foreground"}>
            {re.test(value) ? "✓" : "•"} {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
