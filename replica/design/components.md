# Component specs — Beauty Empire

Tokens: `design/tokens.json` (code: `src/app/globals.css`). Primitives: `src/components/ui/*` (Radix-based, shadcn-style).

```
Button  (ui/button.tsx)
  variants  default (magenta), outline, secondary (blush), ghost, link, destructive, dark
  sizes     sm 36px, default 44px, lg 52px, icon 44px, icon-sm 36px   (touch targets ≥ 44px for primary controls)
  states    hover (deeper magenta, 2px lift on primary), focus-visible (2px magenta ring + offset), disabled (50%), loading (ActionButton: spinner + keeps label)
  a11y      real <button>/<a>; visible text is the accessible name (screen-reader context added with .sr-only, never an overriding aria-label)

Field  (ui/primitives.tsx)
  parts     label (+ required asterisk, aria-hidden), control, hint | error
  a11y      error rendered with role=alert and id `${id}-error`; Field injects aria-describedby + aria-invalid into its control automatically

Input / Textarea / NativeSelect / Checkbox  (ui/input.tsx)
  tokens    border-input #A8879A (3.2:1), focus border magenta + 4px magenta/10 ring, radius xl
  states    focus, invalid, disabled

Calendar  (booking/calendar.tsx)
  structure table with caption, column headers (abbr = full weekday), one <button> per day
  a11y      aria-pressed for the selected day, full spoken date ("Thursday, 19 November, today, unavailable"), month nav buttons 44px, live month label

Choice buttons (staff, payment, time slots, gallery filters)
  pattern   toggle buttons (aria-pressed) inside role=group with a label — not radios/tabs (no arrow-key model needed)
  sizes     time slot 44px high

Dialog / ConfirmDialog / Sheet  (ui/dialog.tsx)
  Radix Dialog: focus trap, Escape, focus return, labelled by DialogTitle; ConfirmDialog for irreversible actions (role=alertdialog)

Table  (ui/primitives.tsx)
  wrapper role=region + aria-label + tabIndex=0 (keyboard scroll on small screens); th text-subtle on ivory

Badge — status colours always with a text label (never colour alone)
EmptyState — icon + title + description + optional action
Skeleton / DashboardLoading — role=status, aria-busy, sr-only "Loading…"
DashboardShell — sidebar (lg) / sheet (mobile), aria-current on active link, notification label matches visible badge
Reveal / FadeIn — CSS-only entrance; scroll-driven reveal as progressive enhancement; all disabled under prefers-reduced-motion; Reveal can render as <li>
Links in text — `.link-inline` (underlined, not colour-only)
```

## Removed patterns (design audit)
- Blurred decorative colour blobs (hero, page heroes, bridal, footer).
- 8-icon-circle "why choose us" grid → editorial numbered list.
- Arched image frames on every secondary page hero → plain 10px frame (arch kept only in the home hero as the signature motif).
- Over-rounded cards (26px) → 14px; base radius 14px → 10px.
