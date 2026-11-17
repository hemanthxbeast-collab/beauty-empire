# Bug report — Beauty Empire audit (branch `improve/replica-audit`, baseline `ae2cdd1`)

Only reproduced bugs are listed. Severity: S1 data/security/payments/core flow · S2 feature broken · S3 broken with workaround or visibly wrong · S4 cosmetic.
Status "fixed" = fixed on the working branch with a test or audit that proves it (uncommitted at time of writing).

### BUG-001: Same customer can be booked twice at the same time ("No preference" + double submit)
- Severity: S1 · Flow F01-E1/E5 · Screen S09
- Steps: submit the same "No preference" booking twice concurrently (double click, retry after timeout).
- Expected: one booking. Actual: two bookings, same customer, same time, two professionals.
- Evidence: integration test "the same customer cannot be booked twice…" failed before the fix (4 concurrent → 2 created).
- Status: fixed — idempotency key (UNIQUE) + per-customer overlap rule under advisory lock. Tests: `booking.test.ts` "Duplicate submission", `booking-resilience.spec.ts` F01-E1.

### BUG-002: Late Razorpay capture on an expired hold marked PAID and emailed "booking received"
- Severity: S1 · Flow F01 online payment
- Steps: create online booking → let 30-min hold expire (released) → payment webhook arrives.
- Expected: booking reinstated if slot free, else refunded; no success email for a non-existent booking.
- Actual: payment PAID on a CANCELLED appointment + success email.
- Status: fixed — `handleLatePayment` (reinstate atomically or refund/flag). Tests: `payments.test.ts` P-E3, P-E4.

### BUG-003: Cancelling/rejecting a paid booking silently kept the money
- Severity: S1 · Flows F03, F04
- Expected (policy text): prepaid amount refunded. Actual: stays PAID, nobody alerted.
- Status: fixed — automatic Razorpay refund, else `payment.refund_required` audit + admin notification + "Refund due" badge. Test: `payments.test.ts` P-E5.

### BUG-004: Better Auth `/update-user` bypassed app validation
- Severity: S2 (security hygiene) · `POST /api/auth/update-user`
- Steps: signed-in user posts `{ "name": "<x>", "phone": "1", "image": "https://evil/x.png" }`.
- Expected: same rules as the profile form. Actual: accepted.
- Status: fixed — auth `before` hook validates name/phone, rejects `image`. Test: E2E `account-security.spec` (bad phone / image / name → 400; valid phone stored as `+91…`).

### BUG-005: Invented business claims on public pages
- Severity: S2 (consumer-protection risk, violates brief) · S01, S02
- "45+", "10+ years", "a decade of artistry", "hundreds of five-star experiences", "certified", "dermatologist-trusted", "hospital-grade", 5.0 fallback rating, fake `@beautyempire` handle, JSON-LD aggregateRating from seeded demo reviews.
- Status: fixed — live facts only; copy rewritten; sweep (`brand.json`) clean.

### BUG-006: Production seed creates fictional staff, offers and stock "real bridal looks"
- Severity: S2 · deployment
- Status: fixed — sample content gated to non-production; verified on a scratch DB (staff 0, offers 0, gallery 0).

### BUG-007: WCAG AA colour contrast failures (398 nodes)
- Severity: S2 (accessibility) · every page · axe `color-contrast`
- Cause: label text `#A77B8D` 3.0–3.6:1; white/75 on magenta 3.75:1; input borders 1.43:1; WhatsApp green 3.49:1; footer "Empire" magenta on charcoal.
- Status: fixed in tokens — 0 failures in `contrast.py` (28 pairs), audit after: see `parity.md`.

### BUG-008: Accessible names contradict visible labels (210 nodes)
- Severity: S3 · axe `label-content-name-mismatch` (logo, card CTAs, notification bell, WhatsApp button)
- Status: fixed in shared components.

### BUG-009: Invalid ARIA patterns — calendar `role=grid` without rows; radios/tabs without keyboard model; invalid `<ol><div><li>`
- Severity: S3 · S09, S06, account/staff/admin filters, bridal steps
- Status: fixed — semantic table + buttons with `aria-pressed`; toggle buttons in labelled groups; `nav`+`aria-current`; `Reveal as="li"`.

### BUG-010: `/staff/availability` horizontal overflow (+7px @390, +38px @1440)
- Severity: S3 · S20 · audit `overflow`
- Status: fixed — flexible time inputs, 2-column leave form, `min-w-0` grid items. Audit after: 0 overflow pages.

### BUG-011: Concurrent requests with the same idempotency key → second got "you already have an appointment"
- Severity: S3 (found by the new test while fixing BUG-001)
- Status: fixed — key checked first under the customer lock, replays original booking.

### BUG-012: Customer reschedule could not offer times overlapping their own current booking
- Severity: S3 · F03
- Status: fixed — availability `exclude` honoured for the booking's owner (admin keeps lead-time override).

### BUG-013: Wizard state synced with effects (lint `set-state-in-effect`), stale slot lists possible; no retry after a failed availability request
- Severity: S3 · S09
- Status: fixed — keyed results, handler resets, "Try again", offline message. Test: `booking-resilience.spec.ts` F01-E2.

### BUG-014: No route loading states
- Severity: S4 · dashboards
- Status: fixed for `/account`, `/staff`, `/admin`. **Not** added to public pages on purpose: a public `loading.tsx` streams a 200 before `notFound()`, turning unknown services into soft-404s (found by `authorization.spec` during this audit and verified).

### BUG-015: E2E selector collision — `data-slot` already used by the shared `Button`
- Severity: S4 (test-only) · Status: fixed — time buttons use `data-time`.

### BUG-016: Fresh production install — `/book` dead end
- Severity: S2 · S09 · empty production DB (0 staff)
- Actual: services selectable, then a calendar with every day disabled. Expected: honest fallback.
- Status: fixed — "Online booking opens soon" with WhatsApp / call; verified on a production build against a production-seeded scratch DB.

### BUG-017: Empty gallery rendered a heading over nothing on the home page; misleading empty copy on /gallery
- Severity: S3 · S01, S06 · Status: fixed (same verification).

### BUG-018: Late-payment reinstatement ignored the one-customer-one-chair rule
- Severity: S3 · Status: fixed — reinstatement takes the customer lock and checks overlap; otherwise refunds.

### BUG-019: Overlap error disclosed an existing booking reference to anyone typing that email
- Severity: S3 (information disclosure) · Status: fixed — message no longer includes the reference.

### BUG-020: Image uploader file input unlabelled; account menu label did not contain its visible name
- Severity: S3 (axe critical `label` ×4 forms, `label-content-name-mismatch`) · found by the widened audit · Status: fixed — audit after: 0.

### BUG-021: No way for a customer to delete their account
- Severity: S3 (privacy / DPDP expectation; backend checklist) · Status: fixed — self-service deletion with anonymisation; E2E covered.

## To check (not reproduced)
- Screen-reader experience end to end (NVDA / VoiceOver): automated rules pass; a human pass is still recommended.
- Razorpay checkout popup, Resend delivery, Cloudinary upload with real keys.
