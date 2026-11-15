# Beauty Empire

A full-stack platform for a premium women's beauty parlour and bridal studio. It covers the public website, real-time online booking, customer accounts, a staff dashboard and a full admin dashboard. Data lives in PostgreSQL, and every protected action is authorized on the server.

> **Beauty. Confidence. You.**

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Quick start](#quick-start)
4. [Environment variables](#environment-variables)
5. [Database: migrations & seeding](#database-migrations--seeding)
6. [Scripts](#scripts)
7. [Testing](#testing)
8. [Architecture](#architecture)
9. [Security](#security)
10. [Integrations & development fallbacks](#integrations--development-fallbacks)
11. [Production deployment (Vercel)](#production-deployment-vercel)
12. [Image credits](#image-credits)

---

## Features

**Public website.** An editorial landing page with a hero, story, signature services, why-us, Bridal Studio, gallery, offers, testimonials, an Instagram grid and contact/map. Other pages: About, Services (search, category filter, sort by price), service details (with structured data), the Bridal Studio page and its consultation form, a filterable gallery with lightbox, Offers, Contact, Privacy and Terms. There is a floating WhatsApp button, and the sitemap, robots file, Open Graph image and per-page metadata are generated.

**Booking engine**: six steps (services → professional → date → time → details → payment), then a confirmation page.
- Multi-service bookings are scheduled back-to-back. "No preference" assigns the least-busy qualified professional.
- Available slots respect salon hours, staff working hours, leave, existing bookings, buffer time, minimum notice and the booking horizon. Everything is computed in the salon timezone (Asia/Kolkata).
- **Double booking is impossible.** Booking takes a per-staff advisory lock inside a transaction and re-checks the slot. Behind that, a **PostgreSQL exclusion constraint** (`btree_gist`, `tstzrange`) rejects overlapping active appointments even if the app logic were bypassed.
- Prices, discounts and totals are always computed on the server. Each confirmation gets a unique reference (`BE-XXXXXXXX`) and a private, signed link.
- Payment is either pay-at-salon or Razorpay. Razorpay is optional and verified server-side; unpaid online bookings hold their slot for 30 minutes.

**Customer account.** Upcoming and past appointments with status and payment status. Customers can cancel (subject to the cancellation window), request a reschedule, leave a review after a completed visit, edit their profile and saved preferences, change their password and read notifications. Guest bookings made with an email address are linked automatically once that address is verified.

**Staff dashboard.** A daily schedule, upcoming and past appointments, the customer details needed for each service, progress notes, completed / no-show marking (own appointments only), and self-service working hours and leave. Staff have no admin powers.

**Admin dashboard** (`/admin`):
- **Overview:** KPIs plus charts for weekly appointments, monthly revenue, booking trend and service popularity.
- **Bookings:** search and filter, then confirm, reject, cancel, complete, mark no-show, reschedule or reassign (conflict-checked), approve reschedule requests, record salon payments and issue refunds.
- **Catalogue:** services (with uploads and discount prices), packages, categories, gallery (publish/unpublish), offers (validity dates, discount %, linked services) and review moderation.
- **People:** customers (with history, enable/disable, enquiry messages) and staff (accounts, services, hours, leave).
- **Payments and settings:** a payments ledger, plus settings for salon details, hours, booking rules, policies and payment options.
- **Audit log:** every admin action is recorded and shown per booking.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions, Route Handlers, `proxy.ts`), **React 19**, **TypeScript 5.9 (strict)** |
| Styling / UI | **Tailwind CSS 4**, shadcn/ui-style components on **Radix UI**, **Lucide** icons, **Motion** for animation, **Bodoni Moda** + **Inter** via `next/font` |
| Forms | **React Hook Form** + **Zod 4**; the same schemas re-validate on the server |
| Data | **PostgreSQL 17**, **Prisma 7** (driver adapter `@prisma/adapter-pg`, migrations, seed) |
| Auth | **Better Auth** (email + password, email verification, password reset, database sessions, rate limiting) |
| Services | **Resend** (email), **Razorpay** (payments), **Cloudinary** (images), **Upstash Redis** (rate limiting), WhatsApp deep links |
| Charts | **Recharts** |
| Testing | **Vitest** (unit + integration against real Postgres), **Playwright** (E2E, desktop + mobile) |
| Hosting | **Vercel** + any managed PostgreSQL (Neon, Supabase, RDS…) |

## Quick start

Prerequisites: **Node.js ≥ 20.9** and **Docker** (for local PostgreSQL), or any PostgreSQL 15+ server.

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env`: set `BETTER_AUTH_SECRET` and `SEED_ADMIN_PASSWORD` (12+ characters). Optionally set `SEED_STAFF_PASSWORD` and `SEED_CUSTOMER_PASSWORD` to log in as sample staff and customers.

```bash
docker compose up -d
```

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open <http://localhost:3000>. Sign in at `/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and you are sent to `/admin`. Sample staff use their seeded emails (for example `priya@beautyempire.test`) with `SEED_STAFF_PASSWORD`.

**Emails in development:** without `RESEND_API_KEY`, nothing is sent. Each email is written to `./.dev-mail/*.html`, and the console prints its path. Open the file to click verification or password-reset links.

## Environment variables

Everything is documented in [`.env.example`](.env.example). Summary:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Signs sessions, tokens and booking links (32+ random bytes) |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL. Use `https://…` in production; this enables secure cookies, HSTS and `upgrade-insecure-requests` |
| `SALON_TIMEZONE` | – | Defaults to `Asia/Kolkata` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | first run | Creates or updates the admin account during seeding |
| `RESEND_API_KEY`, `EMAIL_FROM` | prod | Transactional email |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | optional | Online payments |
| `CLOUDINARY_*` | prod uploads | Image uploads |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | recommended | Rate limiting shared across instances |
| `CRON_SECRET` | prod | Protects `/api/cron/reminders` |
| `TEST_DATABASE_URL` | tests | Separate test database; its name must contain `test` |

Secrets are only read in server modules (`src/server/**`, marked `server-only`), and nothing secret is prefixed `NEXT_PUBLIC_`.

## Database: migrations & seeding

The schema is in [`prisma/schema.prisma`](prisma/schema.prisma). Its 20+ models include User, CustomerProfile, StaffProfile, Service, ServiceCategory, ServicePackage, Appointment, AppointmentService, StaffAvailability, StaffLeave, Payment, Review, GalleryImage, Offer, ContactMessage, Notification, SalonSettings, AuditLog, plus Better Auth's session, account and verification tables.

- Money uses `Decimal(10,2)` with INR as the default currency.
- Times are stored as UTC `timestamptz`; calendar-only dates (leave, offers) use the `date` type.
- Foreign keys use explicit `onDelete` rules. Indexes cover every hot query (staff/time, customer/time, status/time).
- Migration `booking_integrity_constraints` adds the overlap exclusion constraint and CHECK constraints (non-negative money, rating 1–5, valid time ranges, single settings row).
- Each appointment line stores snapshots of service name, price and duration, so history stays accurate after catalogue edits.

```bash
npm run db:migrate
```

`db:migrate` creates and applies a new migration in development (`prisma migrate dev`).

```bash
npm run db:deploy
```

`db:deploy` applies pending migrations (production / CI).

```bash
npm run db:seed
```

The seed is idempotent and creates salon settings, 7 categories, 46 services, 5 staff, packages, offers, gallery images and demo data.

```bash
npm run db:studio
```

`db:studio` opens Prisma Studio.

No credentials are hard-coded. The seed creates logins only for passwords you supply through environment variables, and it never creates staff or customer logins when `NODE_ENV=production`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | All Vitest suites (unit + integration) |
| `npm run test:unit` | Pure unit tests (no database) |
| `npm run test:integration` | Integration tests against `TEST_DATABASE_URL` |
| `npm run test:e2e` | Playwright end-to-end tests (builds and serves on :3100 against the test DB) |
| `npm run db:*` | Prisma helpers (see above) |

## Testing

Create the test database once (Docker setup):

```bash
docker exec beauty-empire-db psql -U beauty -c "CREATE DATABASE beauty_empire_test"
```

```bash
npm test
```

```bash
npx playwright install chromium
```

```bash
npm run test:e2e
```

Integration and E2E runs migrate and **wipe** the test database. They refuse to run against any database whose name does not contain `test`. E2E runs use random per-run passwords created by the real seed script.

The required scenarios are covered by these tests:

| # | Scenario | Tests |
|---|---|---|
| 1 | Register & log in | `e2e/auth.spec.ts` |
| 2 | Unverified / unauthorized users blocked | `e2e/auth.spec.ts`, `e2e/authorization.spec.ts` |
| 3 | Admin adds a service (visible publicly) | `e2e/admin.spec.ts` |
| 4 | Customer books an available service | `integration/booking.test.ts`, `e2e/booking.spec.ts` |
| 5 | Two customers can't take the same slot (6 concurrent requests → 1 wins; DB constraint) | `integration/booking.test.ts` |
| 6 | Customer can't access another's bookings | `integration/booking.test.ts`, `e2e/authorization.spec.ts` |
| 7 | Staff can't do admin operations | `integration/booking.test.ts`, `e2e/authorization.spec.ts` |
| 8 | Admin manages bookings (confirm / reschedule / cancel) | `integration/booking.test.ts`, `e2e/admin.spec.ts` |
| 9 | Cancellation follows policy | `unit/slots.test.ts`, `integration/booking.test.ts`, `e2e/booking.spec.ts` |
| 10 | Payment marked paid only after verified confirmation (forged signature, wrong booking, amount mismatch, idempotency) | `unit/security.test.ts`, `integration/payments.test.ts` |

Further tests cover slot generation (hours, leave, buffer, lead time, IST conversion), validation schemas, upload magic-byte sniffing, HTML escaping, open-redirect protection, CSRF origin checks and responsive layout on desktop and mobile.

## Architecture

```
prisma/                 schema, migrations, seed
src/
  proxy.ts              optimistic auth redirect for /account, /staff, /admin
  app/
    (site)/             public pages + /book wizard + confirmation
    (auth)/             login, register, forgot/reset password
    account/ staff/ admin/   role-scoped dashboards (each layout enforces its role)
    api/                auth, availability, Razorpay order/verify/webhook, admin upload, cron
  components/
    ui/                 design-system primitives (Radix-based)
    site/ booking/ account/ dashboard/ admin/ staff/
  lib/                  pure, isomorphic code: validation (Zod), slot engine, time zone, utils
  server/               server-only code
    auth.ts session.ts  Better Auth instance + role guards (page vs action variants)
    services/           business logic: booking, availability, payments, notifications, audit, rate-limit, settings
    actions/            Server Actions (validate → authorize → call service → audit → revalidate)
    queries/            read models for pages
    email/              templates + Resend sender with dev outbox
tests/ unit/ integration/ e2e/
```

Business rules live in `src/server/services/*` and `src/lib/booking/*`, never in components. Admin changes call `revalidatePath`, so the public site updates immediately.

## Security

- **Authentication:** Better Auth with scrypt password hashing, database-backed sessions (7-day expiry, rolling refresh) in httpOnly / SameSite=Lax / Secure cookies, mandatory email verification, and single-use reset tokens that expire after 1 hour. A password reset or change revokes the user's other sessions. A strong password policy is enforced on the server.
- **Authorization:** every page, Server Action and route handler re-checks the session and role on the server. Ownership checks return "not found" for other users' bookings. Staff can only change their own appointments, and only through permitted transitions. Disabling a user revokes their sessions immediately.
- **Abuse protection:** rate limits apply to sign-in (5/min), sign-up, password reset, booking, contact, reviews, payments and uploads, using Upstash in production and an in-memory fallback in development. The contact form has a honeypot.
- **Input & output:** Zod validates everything on the server. Prisma uses parameterized queries. React escapes output, emails escape HTML, and JSON-LD is escaped. Image URLs are allow-listed. Uploads are checked by magic bytes, limited to 5 MB and stored with random names.
- **CSRF:** Better Auth checks the request origin, Server Actions get Next.js's built-in origin check, and JSON route handlers require a same-origin `Origin` header.
- **Headers:** CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, Referrer-Policy and Permissions-Policy are always sent, plus HSTS on https.
- **Payments:** card data is never stored. Razorpay signatures are verified with HMAC and constant-time comparison, and each payment is confirmed against the Razorpay API. The amount is checked against the booking stored in the database. Webhooks are verified against the raw body and deduplicated by event ID. Marking a payment as paid is idempotent and transactional.
- **Errors & audit:** errors shown to users are generic and details go only to server logs. Administrative actions are written to `audit_log`.

**CSP note:** without per-request nonces, Next.js needs `'unsafe-inline'` for its inline bootstrap scripts. No user-supplied HTML is ever rendered. To harden further, switch to nonce-based CSP in `proxy.ts`; the trade-off is that every page renders dynamically.

## Integrations & development fallbacks

None of these fallbacks fakes a real transaction:

| Integration | Configured | Not configured |
|---|---|---|
| Resend | Real emails | Dev: written to `.dev-mail/` (clearly marked *not sent*). Prod: logged as an error |
| Razorpay | "Pay online" available once enabled in Admin → Settings | Option shown as unavailable; Pay at Salon only |
| Cloudinary | Uploads to Cloudinary | Dev: `public/uploads/`. Prod: upload refused with a clear message |
| Upstash | Distributed rate limiting | In-memory limiter |
| WhatsApp | Uses the salon's WhatsApp number from Settings: `wa.me` links with pre-filled booking messages | — |

## Production deployment (Vercel)

1. Create a managed PostgreSQL database (Neon, Supabase, RDS, etc.) and copy its connection string.
2. Import the repository into Vercel. Set every variable from `.env.example`, with `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` set to `https://your-domain`.
3. The included [`vercel.json`](vercel.json) runs `prisma migrate deploy` before `next build`, and schedules `/api/cron/reminders` hourly. On the Vercel Hobby plan, change the schedule to daily.
4. After the first deploy, seed the production database once from your machine with the production `DATABASE_URL` and the `SEED_ADMIN_*` variables:

   ```bash
   SEED_DEMO_DATA=false npm run db:seed
   ```

5. **Razorpay:** add a webhook for `payment.captured`, `payment.failed` and `order.paid` pointing to `https://your-domain/api/payments/razorpay/webhook`, then turn on online payments in **Admin → Settings**.
6. **Resend:** verify your sending domain and set `EMAIL_FROM`.
7. **Content:** replace the placeholder photography and the salon address, phone and map in **Admin → Settings / Gallery / Services**.

## Image credits

Placeholder photography is from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license), which allows free commercial use. Replace it with the salon's own photography before launch; everything is managed from the admin dashboard.
