# Improvement log

Branch `improve/replica-audit` off baseline `ae2cdd1`. Each entry: what, why (evidence), files, verification.

## Baseline (2026-11-16)
- Parity (spec vs implementation): **84.3 / 100**, must-haves 37/48 (`parity-before.md`).
- axe WCAG 2.1 AA over 81 page loads / 54 axe scans (the baseline script skipped axe at tablet width): color-contrast 398 nodes, label-content-name-mismatch 210, list/listitem 10, scrollable-region-focusable 1, link-in-text-block 4 (`audit-before.json`).
- Overflow: `/staff/availability` +7px @390, +38px @1440.
- ESLint (newly added): 7 errors, 6 warnings.
- Tests: 58 Vitest + 29 Playwright passing.

## Changes
### P0-1 Booking duplicate submission (fixed)
- **Evidence:** with "No preference", concurrent submissions from one customer booked two professionals at the same time (no per-customer rule; no idempotency).
- **Fix:** `appointment.idempotencyKey` UNIQUE column (migration `20261116180000_booking_idempotency`); wizard sends one UUID per attempt; server replays the original booking for a repeated key (including concurrent duplicates, detected under lock); a key replayed with different contact details is refused. New rule: one customer email cannot hold overlapping active bookings, enforced inside the booking transaction under a `customer:` advisory lock (lock order customer → staff, so no deadlocks).
- **Files:** `prisma/schema.prisma`, migration, `src/server/services/booking.ts`, `src/lib/validations/booking.ts`, `src/components/booking/booking-wizard.tsx`.
- **Verified:** integration tests "Duplicate submission" (4 concurrent same-customer → 1 booking; concurrent + sequential replay → same reference; mismatched replay refused).

### P0-2 Late payment on expired hold (fixed)
- **Evidence:** `markOrderPaid` set PAID on a CANCELLED appointment and emailed "We received your booking".
- **Fix:** success email only for active bookings; for a hold-expired booking the slot is reinstated atomically (exclusion constraint decides), otherwise the money is refunded (Razorpay) or flagged "Refund required" to admins.
- **Files:** `src/server/services/payments.ts`, `availability.ts` (`HOLD_EXPIRED_REASON`), new `overlap.ts`.
- **Verified:** integration tests (slot free → reinstated PENDING+PAID; slot taken → stays cancelled, admin refund notification).

### P0-3 Paid bookings cancelled/rejected kept the money silently (fixed)
- **Fix:** `refundPaidPayments` on customer cancel and admin cancel/reject — automatic Razorpay refund, else audit `payment.refund_required` + admin notification; admin booking page shows "Refund due".
- **Verified:** integration test "cancelling a paid booking flags the payment for refund".

### P1 Better Auth `update-user` bypassed app validation (fixed)
- `POST /api/auth/update-user` could set any name/phone/image. Auth `before` hook now validates name & phone (normalised) and rejects `image`. File: `src/server/auth.ts`.

### P0-4 Invented marketing claims (fixed)
- Removed "45+", "10+ years", "a decade", "hundreds of five-star", "certified", "dermatologist-trusted", "hospital-grade", the 5.0 fallback rating, the `@beautyempire` handle, and JSON-LD `aggregateRating` (self-served reviews; Google ignores them for LocalBusiness).
- Hero now shows only live facts: rating (only when real reviews exist, with count), active service count, specialist count, today's opening hours from Settings. Welcome tile shows the real number of service categories. Instagram heading uses the handle parsed from Settings, and the section only renders when an Instagram URL is configured.
- "Why Beauty Empire" copy rewritten as commitments, not claims. About-page history rewritten without invented facts.
- Files: `src/app/(site)/page.tsx`, `about/page.tsx`, `src/server/services/settings.ts`.

### Design system (replica-design)
- `replica/design/tokens.json` (roles) + `tokens-before.json`; contrast tool: **5 AA failures → 0** (28 pairs).
- Text-role rose `#A77B8D → #8A5A6E` (3.0–3.6:1 → 4.7–6.0:1); input border `#E6D3DB → #A8879A` (1.4:1 → 3.2:1); white-on-magenta labels at full opacity.
- Radius scale tightened (card 26px → 14px, base 14px → 10px) for an editorial rather than "app card" look; decorative blurred colour blobs removed from hero, page heroes, bridal and footer; the 8-icon-circle "why us" grid replaced by an editorial numbered list.
- `.link-inline` utility: links inside sentences are underlined (WCAG 1.4.1).

### Accessibility (shared components)
- Label-in-name: logo no longer overrides its visible name; card CTAs keep visible text and add screen-reader context; notification badge hidden from AT.
- Calendar rebuilt as a semantic table of real buttons (`aria-pressed`, full spoken date, caption) instead of `role=grid` without rows.
- Staff / time / payment choices and gallery filters: `aria-pressed` toggle buttons in labelled groups (they were `role=radio`/`tab` without the required arrow-key behaviour or panels). Link "tabs" are now `nav` + `aria-current="page"`.
- `Field` links its hint/error to the control (`aria-describedby`, `aria-invalid`) automatically — for a single control, or the first element when a field has several children (e.g. password + strength meter).
- Tables: scroll region is focusable and labelled. Icon buttons 44px, calendar nav 44px, time slots 44px.
- Lists: `Reveal` can render as `<li>` (bridal steps list was `<ol><div><li>`).

### Booking UX
- Wizard: availability results keyed by query (no stale slots, no setState-in-effect); "Try again" on load failure with offline detection; slot conflicts on submit return to the time step with a refreshed list; network failure on submit explains that retrying is safe (idempotency); inline error panel; mobile progress ("Step 2 of 6") instead of a horizontal pill scroller; sticky mobile bar shows the running total; "Continue" available again on the date step after going back.
- Customer reschedule now sees times overlapping their own current booking (`exclude` honoured for the owner, admin keeps lead-time override). Shared `useSlots` hook for both reschedule dialogs.

### Responsive
- `/staff/availability` and admin staff page: overflow fixed (leave form 2-column, flexible time inputs, `min-w-0` grid items).

### Lint
- ESLint (flat config, `eslint-config-next`) added: 7 errors → 0. Remaining 6 warnings are React Compiler notices for react-hook-form `watch()`.

### P0-5 Production seed (fixed)
- Sample staff, offers, packages, stock gallery photos and demo customers/bookings/reviews are now created only outside production and unless `SEED_DEMO_DATA=false`. Social links default to empty (no generic instagram.com / facebook.com links).
- **Verified:** `NODE_ENV=production` seed on a scratch database → staff 0, offers 0, gallery 0, appointments 0, services 46, users 1 (admin).
- Bridal gallery heading no longer says "Real bridal looks" (placeholder photos are stock).

### Contrast / naming follow-ups (from mid audit: 623 → 60 nodes)
- WhatsApp green token `#1F9D55 → #177A43` (3.5:1 → 5.4:1 with white). Footer logo uses rose on charcoal. Category counts no longer use opacity. Notification label matches the visible "9+" badge. WhatsApp float has no overriding aria-label.

### Product (replica-entrepreneur — 0 reviews exist; ideas from flow analysis, see fixes.md)
- Add to calendar: `GET /api/bookings/[ref]/calendar` (iCalendar, 2-hour alarm, CANCEL when cancelled) — access = signed token, owning customer or admin. Buttons on confirmation and appointment detail.
- "Book these services again" (same professional) on completed visits.
- Admin dashboard "Today's schedule" (time-ordered, staff, status, payment).
- Landing: "Book in about a minute" three-step section; hero shows today's hours and location (#contact).

### Brand (replica-brand — name/palette kept by instruction)
- Voice + CTA vocabulary in `brand.md`; email templates and OG image moved to the AA text rose; `apple-icon` (180px) added; sweep over source clean.

### Performance
- Public pages no longer ship the Better Auth client SDK just for sign-out (`src/lib/sign-out.ts` fetch).
- Recharts (≈378 KB) confirmed admin-only (route-split). Motion only in gallery/wizard. Reveal/FadeIn are CSS-only (no JS).
- Public `loading.tsx` deliberately NOT added: it streams a 200 before `notFound()` → soft-404s for unknown services (SEO). Dashboards keep loading skeletons.

### Tests
- New E2E specs: `a11y.spec` (axe on every wizard step, validation errors, mobile menu, lightbox, cancel dialog, admin booking detail), `booking-resilience.spec` (double click → 1 booking checked in DB, offline availability + retry, reschedule request, .ics), `auth-recovery.spec` (wrong password, full reset via email link, invalid token), `admin-content.spec` (offer, gallery, staff, review moderation reflect publicly).
- Every E2E test now fails on browser console errors and any 5xx (guard fixture).
- New integration tests: duplicate submission ×3, late payment ×2, refund on cancel.

### Post-review fixes (second advisor pass)
- **Empty production state** (scratch DB seeded with `NODE_ENV=production`, served by a production build): `/book` with no staff was a dead end (every calendar day disabled) → now "Online booking opens soon" with WhatsApp/call. Home gallery heading no longer renders over nothing. Empty gallery copy fixed. All public pages 200, 0 console errors.
- **Late-payment reinstatement** now takes the customer lock and applies the one-customer-one-chair rule (previously only the staff slot was checked).
- **Overlap error no longer discloses a booking reference** to whoever types an email address.
- **BUG-004 now tested**: E2E `account-security.spec` posts bad phone / image / bad name to `/api/auth/update-user` (400) and a valid phone (stored normalised).
- **Account deletion added** (backend checklist): see `backend.md`; E2E covers refusal with upcoming bookings and real deletion.
- Privacy policy names every processor and the self-service deletion path; inline legal links underlined.
- Production seed prints a warning that placeholder contact details must be replaced.
- Audit widened: + legal pages, password pages, account notifications, staff profile, admin categories/payments/messages, every admin create form, booking detail and confirmation page; axe now runs at all three widths. Counts corrected (baseline was 81 page loads / 54 axe scans).
- `replica/backend.md` (checklist with evidence) and `replica/build-log.md` (per-screen states) written.

### Final audit (widened)
- 126 page loads / 126 axe scans (visitor 15 routes, customer 5, staff 4, admin 18 incl. every create form, booking detail and confirmation; 390/768/1440): **0 violations, 0 overflow, 0 non-200**.
- The widening found 2 more issues, now fixed: the image uploader's hidden file input had no label (now removed from the accessibility tree; the visible "Upload image" button drives it; URL field labelled), and the navbar account-menu label did not contain its visible name.
- Final runs: Vitest 64/64, Playwright 44 passed + 1 skipped (by design), ESLint 0 errors, `tsc` 0 errors.
- Environment note: Docker Desktop stopped three times during the session (DB down → 500s / build failures); each time it was restarted and the affected run repeated. The `beauty-empire-db` container now has `--restart unless-stopped`.
