# Architecture audit: Beauty Empire

This is an audit of an existing system, not a greenfield plan, so good decisions are kept and only real defects are changed.

## Stack — keep

| layer | in use | verdict |
| --- | --- | --- |
| web | Next.js 16 App Router + TS strict | keep — RSC + Server Actions fit a mostly-server CRUD app |
| styling | Tailwind 4 tokens in `globals.css`, Radix primitives | keep; tokens refined (see `design/`) |
| DB | PostgreSQL 17, one database | keep — exclusion constraints are the core integrity tool |
| ORM | Prisma 7 + `adapter-pg` | keep; raw SQL only for advisory locks / constraint migration |
| auth | Better Auth (DB sessions, verification, reset, rate limit) | keep |
| payments | Razorpay (India) — *not* Stripe as the skill default suggests | keep: INR/UPI market fit |
| email / files / limits | Resend / Cloudinary / Upstash | keep, all optional with honest dev fallbacks |
| jobs | Vercel Cron → `/api/cron/reminders` | keep |

## Schema review

Matches the skill's checklist with two deliberate deviations: ids are `cuid()` text (fine, opaque) and money is `DECIMAL(10,2)` INR rather than integer paise (exact decimal arithmetic via `Prisma.Decimal`; converted to paise only at the Razorpay boundary — acceptable).
Every FK has an explicit `onDelete`; hot paths indexed (`appointment(staffId,startAt)`, `(customerId,startAt)`, `(status,startAt)`); times are `timestamptz` UTC; statuses are enums; CHECK constraints guard money, ratings and ranges; `salon_settings` is a singleton by CHECK.
Access control is **one authorisation check per operation in the data layer** (no RLS): every Server Action/route calls `requireUser/requireRole/requireCustomer/requireStaff/requireAdmin`, and customer reads go through ownership-scoped queries (`getCustomerAppointment(customerProfileId, id)`).

### Booking concurrency — verified

1. `computeAvailability` filters out busy, leave, closed and lead-time slots (UX).
2. `insertAppointment` runs in a transaction holding `pg_advisory_xact_lock(hashtext('staff:'+id))`, re-checks overlap, inserts (serialises same-staff writers).
3. Migration `booking_integrity_constraints`: `EXCLUDE USING gist (staffId WITH =, tstzrange(startAt,endAt,'[)') WITH &&) WHERE status IN ('PENDING','CONFIRMED')` — the database rejects any overlapping active booking even if application code is bypassed (integration test inserts directly via Prisma and gets `23P01`).
4. Evidence: integration test fires 6 concurrent bookings for one staff/time → exactly 1 succeeds, 5 get `CONFLICT`.

**Gap found (P0):** the guarantee is per *professional*. With "No preference", a double-submitted form (double click, retry after a timeout) books the **same customer twice** at the same time with two different professionals. Fix: (a) client idempotency key stored in a UNIQUE column → a retried request returns the original booking; (b) server rule — one customer email cannot hold two overlapping active appointments.

### Payment state machine

```
Appointment.paymentStatus: UNPAID (pay at salon) | PENDING (online, order open) | PAID | FAILED | REFUNDED
Payment.status: PENDING -> PAID | FAILED ; PAID -> REFUNDED
```
Kept: amount always from DB; HMAC verified with constant-time compare; Razorpay API confirms order/amount; `markOrderPaid` idempotent (`updateMany where status <> PAID`); webhook verified on raw body and de-duplicated by event id.
**Gaps found (P0):**
- Late capture after the 30-minute hold expired (appointment already `CANCELLED`) is marked PAID and emails "We received your booking" for a booking that no longer exists. Fix: reinstate the booking if the hold-expired slot is still free (the exclusion constraint decides atomically), otherwise auto-refund (or flag for manual refund) and notify admins — never send a success email for an inactive booking.
- Cancelling/rejecting a PAID booking leaves money held with no refund path surfaced, although the policy promises refunds. Fix: on cancel/reject of an online-paid booking attempt an automatic Razorpay refund; if that is impossible, notify admins and show "Refund due" on the booking.

## API surface (who can call what)

| route / action | purpose | caller |
| --- | --- | --- |
| `GET /api/availability` | slots for services/staff/date | public, rate-limited; `exclude=` honoured only for ADMIN |
| `POST /api/payments/razorpay/order`, `/verify` | open order, verify checkout | booking-token holder, owning customer, or admin; same-origin only |
| `POST /api/payments/razorpay/webhook` | async capture/failure | Razorpay (HMAC) |
| `POST /api/admin/upload` | image upload | ADMIN, same-origin, 5 MB, magic bytes |
| `GET /api/cron/reminders` | reminders + release holds | Vercel Cron (Bearer secret) |
| `/api/auth/*` | Better Auth | public (rate limited) |
| `createBookingAction` | book | anyone (guest) — rate-limited |
| `cancelMyBookingAction`, `requestRescheduleAction`, `submitReviewAction`, `updateProfileAction` | customer self-service | CUSTOMER, ownership-checked |
| `updateBookingStatusAction` | status transitions | ADMIN (all) / STAFF (own, complete/no-show only) |
| `saveAvailabilityAction`, `addLeaveAction`, `deleteLeaveAction` | hours/leave | ADMIN (any) / STAFF (self only) |
| `saveStaffNotesAction` | progress notes | STAFF (own appointments) |
| all `admin-catalog.ts`, other `admin-ops.ts` actions | management | ADMIN |

**Gap found (P1):** Better Auth's built-in `POST /api/auth/update-user` lets a signed-in user set `name`, `phone` and `image` directly, bypassing the app's Zod rules (name charset, Indian phone normalisation) and allowing an arbitrary image URL. Fix: validate those fields in the auth `before` hook and reject `image`.

## Parts that bite

- **Time zones:** salon zone `Asia/Kolkata` (no DST) via `@date-fns/tz`; slot math in minutes-of-day per date key; unit-tested incl. UTC conversion.
- **Idempotency:** webhooks (event id), payment capture (conditional update), reminders (claim column) — booking creation was the missing one (fixed).
- **Races:** booking (advisory lock + exclusion), status transitions (optimistic `updateMany where status = old`).
- **Rate limits:** Better Auth DB limiter for auth endpoints; app limiter (Upstash or memory) for actions; client IP from `x-forwarded-for` — trustworthy on Vercel, spoofable on a bare server (documented).
- **Performance:** the `(site)` layout reads the session, so every public page renders dynamically and `revalidatePath` buys no caching. Acceptable at salon scale; the improvement (client-side session in the navbar → static/ISR pages) is noted as P2.
- **Accepted risk:** booking confirmation links (HMAC token) do not expire; they expose one booking's details to whoever holds the link.

## Fix order executed in this pass

1. P0 integrity: idempotent booking + per-customer overlap; late-payment handling; refunds on cancel; `update-user` validation; invented claims; production seed.
2. P1: accessibility (tokens, names, markup), responsive overflow, booking UX resilience, loading states, admin "today" view.
3. P2: lint clean, performance where cheap.
