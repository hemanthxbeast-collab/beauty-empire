# Recon map: Beauty Empire (web, responsive)

Scope: audit of the **existing** Beauty Empire application in this repository (not a clone of a third-party app).
"Original" in the Replica artifacts = what the Beauty Empire specification requires; "clone" = what the code actually does.
For: a single premium women's beauty parlour & bridal studio (Hyderabad placeholder data).
Date: 2026-11-16 · Baseline commit: `ae2cdd1` (branch `main`) · Work branch: `improve/replica-audit`

## Sources

| # | source | location | notes |
| --- | --- | --- | --- |
| 1 | Product specification | the "Beauty Empire master prompt" (user brief) | defines must/should requirements |
| 2 | Source code | `src/**`, `prisma/**` | read end to end for this audit |
| 3 | Running app | `npm run dev` on :3000, seeded with demo data | driven as visitor, customer, staff, admin |
| 4 | Automated audit | `scripts/audit.mjs` → `replica/audit-before.json`, `replica/screens/before/` | baseline: 81 page loads, 54 axe WCAG 2.1 AA scans (390/1440), overflow at 390/768/1440 |
| 5 | Test suites | `tests/unit`, `tests/integration`, `tests/e2e` | 58 Vitest + 29 Playwright passing at baseline |
| 6 | Linter | `eslint.config.mjs` (added in this audit — there was no linter before) | 7 errors, 6 warnings at baseline |

No third-party product is being cloned, so there are no external sources, screenshots of other apps, or public reviews.

## Stack (as found)

Next.js 16.4 App Router (RSC, Server Actions, Route Handlers, `proxy.ts`) · React 19.3 · TypeScript 5.9 strict ·
Tailwind 4 (CSS-first tokens in `globals.css`) · Radix primitives (shadcn-style, hand-written) · Motion (only gallery + wizard) ·
Prisma 7.10 + `@prisma/adapter-pg` · PostgreSQL 17 · Better Auth 1.7 (email/password, verification, reset, DB sessions, DB rate limit) ·
Zod 4 + React Hook Form · Recharts · Resend / Razorpay / Cloudinary / Upstash with dev fallbacks · Vitest + Playwright.

## Core loop

A visitor chooses services, a professional, a date and a time, and books an appointment that the salon confirms — then manages it from an account.

## Screens

| ID | screen | route | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | `/` | brand, services, bridal, gallery, offers, reviews, contact | Navbar, Hero, ServiceCard, OfferCard, TestimonialCard, ContactSection | filled; no-offers/no-reviews sections hide |
| S02 | About | `/about` | story, values, team | PageHero, staff cards | filled |
| S03 | Services | `/services?q&category&sort` | discovery | search form, category chips, sort, ServiceCard grid | filled, empty (no results) |
| S04 | Service detail | `/services/[slug]` | details, specialists, reviews, related | price/duration panel, staff list | filled, 404 |
| S05 | Bridal Studio | `/bridal` | bridal positioning, packages, consultation form | packages, steps, ContactForm | filled |
| S06 | Gallery | `/gallery?category` | portfolio | GalleryGrid (filter tabs, masonry, lightbox dialog) | filled, empty category |
| S07 | Offers | `/offers` | promotions & packages | OfferCard | filled, empty |
| S08 | Contact | `/contact` | map, hours, WhatsApp, form | ContactSection | filled, sent |
| S09 | Booking wizard | `/book?service&staff&offer` | 6-step booking | step nav, service picker, staff radios, Calendar, slot grid, details form, payment options, summary | each step; loading slots, no slots, error |
| S10 | Confirmation | `/book/confirmation/[ref]?t=` | receipt + pay-now | price table, badges, PayNowButton | pending, confirmed, awaiting payment, cancelled, 404 without token |
| S11 | Login | `/login` | sign in | form, unverified panel | error, rate-limited, unverified, notices |
| S12 | Register | `/register` | sign up | form, password strength | errors, check-inbox |
| S13 | Forgot / Reset password | `/forgot-password`, `/reset-password` | recovery | forms | sent, invalid token |
| S14 | Customer overview | `/account` | KPIs, upcoming | StatCard, AppointmentList | filled, empty |
| S15 | My appointments | `/account/appointments?tab` | upcoming / past | tabs, AppointmentList | filled, empty |
| S16 | Appointment detail | `/account/appointments/[id]` | manage | cancel dialog, reschedule dialog, review form, pay-now | active, inside window, completed, reviewed, 404 (not owner) |
| S17 | Profile | `/account/profile` | details & preferences, password | ProfileForm, ChangePasswordForm | saved, errors |
| S18 | My reviews / Notifications | `/account/reviews`, `/account/notifications` | reviews, inbox | lists | filled, empty |
| S19 | Staff today | `/staff` | daily schedule | StaffAppointmentCard, notes | filled, empty |
| S20 | Staff appointments / availability / profile | `/staff/*` | schedule, hours, leave | AvailabilityEditor, LeaveManager | filled, empty |
| S21 | Admin dashboard | `/admin` | KPIs, charts, recent | StatCard, charts, table | filled |
| S22 | Admin bookings list / detail | `/admin/bookings`, `/admin/bookings/[id]` | operations | FilterBar, Table, status actions, reschedule dialog, payments, activity | filled, empty, reschedule request |
| S23 | Admin catalogue | `/admin/services`, `/[id]`, `/packages/[id]`, `/admin/categories` | services, packages, categories | tables, ServiceForm, PackageForm, CategoryDialog, ImageUpload | filled |
| S24 | Admin staff | `/admin/staff`, `/[id]` | accounts, services, hours, leave | StaffForm, AvailabilityEditor | filled |
| S25 | Admin customers / messages | `/admin/customers?tab`, `/[id]` | CRM, enquiries | tables, history | filled, empty |
| S26 | Admin gallery / offers / reviews / payments / settings | `/admin/*` | content, moderation, ledger, config | dialogs, forms | filled, empty |
| S27 | Errors | `/forbidden`, not-found, error boundary | — | — | — |

## Flows

```
F01 Visitor books as guest
    S01 -> S09 (services -> professional -> date -> time -> details -> payment) -> S10
    happy path clicks: 9 (select service, continue, no-preference, continue, date, time, continue, continue(details), accept+confirm)
    edge: slot taken meanwhile (409 + back to time step), no slots on date, online payment disabled, abandoned online payment (hold released after 30 min)
F02 Customer registers and verifies
    S12 -> email link -> S14 ; edge: unverified sign-in shows verify panel + resend
F03 Customer manages a booking
    S15 -> S16 -> cancel | request reschedule | pay | review ; edge: inside cancellation window, not owner (404)
F04 Admin confirms / reschedules / completes
    S21 -> S22 list -> S22 detail -> confirm | reschedule (conflict-checked) | complete (only after start) | record payment | refund
F05 Admin manages catalogue / content
    S23/S26 -> forms -> public pages revalidate
F06 Staff runs the day
    S19 -> mark completed / no-show, notes ; S20 hours & leave
F07 Password recovery
    S11 -> S13 forgot -> email -> S13 reset -> S11 (sessions revoked)
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | default, outline, secondary, ghost, link, destructive, dark; sm/default/lg/icon | hover, focus-visible, disabled, loading (via ActionButton) | all |
| Input / Textarea / NativeSelect / Checkbox | — | focus, invalid (`aria-invalid`), disabled | forms |
| Field | required marker, hint, error | error linked by id (only when the child sets `aria-describedby`) | forms |
| Card, Badge (8 variants), Table, Skeleton, EmptyState | — | — | dashboards |
| Dialog / ConfirmDialog / Sheet (side=right) | center, right | open/close, pending | nav, confirmations |
| DropdownMenu, Switch | — | — | navbar, settings |
| Calendar | — | disabled days, selected, today | wizard, reschedule |
| ServiceCard, OfferCard, TestimonialCard, Stars | — | discount badge | public |
| DashboardShell, PageHeader, StatCard | accent | active nav, badges | account, staff, admin |
| FilterBar / SearchField / SelectField / DateField / Pagination | — | — | admin lists |

## Data model (actual, from `prisma/schema.prisma`)

```
User(id, name, email*, emailVerified, role CUSTOMER|STAFF|ADMIN, phone, isActive) 1-1 CustomerProfile | StaffProfile
Session, Account, Verification, RateLimit           (Better Auth)
ServiceCategory 1-n Service n-n StaffProfile (StaffService)
ServicePackage n-n Service (ServicePackageItem) ; Offer n-n Service (OfferService)
Appointment(reference*, customerId?, staffId, startAt, endAt, status, contact snapshot, subtotal/discount/total DECIMAL, paymentMethod, paymentStatus,
            reschedule request fields, staffNotes, reminderSentAt) 1-n AppointmentService (price/duration snapshots) 1-n Payment ; 1-1 Review
StaffAvailability(staffId, dayOfWeek)* ; StaffLeave(date range)
Payment(razorpayOrderId*, razorpayPaymentId*, status) ; WebhookEvent(id = provider event id)
GalleryImage, ContactMessage, Notification, SalonSettings (singleton, CHECK id=1), AuditLog
DB constraints: EXCLUDE USING gist (staffId =, tstzrange(startAt,endAt) &&) WHERE status IN (PENDING, CONFIRMED); CHECKs on money, rating, ranges.
confidence: high (read from schema + migrations)
```

## Feature matrix

See `features.csv` (baseline snapshot: `features-before.csv`). Counts are in `parity.md`.

## Out of scope

- Real salon photography, address, staff and prices (client content — placeholders in seed).
- Live payments / email / CDN accounts (need the client's own accounts and keys; integrations exist with dev fallbacks).
- Public reviews / market research for `/replica-entrepreneur` — none exist for this unreleased product; nothing is invented.

## Size

Screens 27 (+ variants), flows 7, entities 22. Hard parts: booking concurrency, timezone-correct availability, payment state machine.
Size of this improvement pass: M.

## Audit findings (summary — details in `architecture.md`, `bug-report.md`)

Implemented and working: almost the entire spec (see features.csv).
Broken / wrong at baseline:
- **P0** "No preference" + double submit can book the same customer twice at the same time with two professionals.
- **P0** a late Razorpay payment on an already-cancelled (expired hold) booking is marked PAID and emails "booking received".
- **P0** cancelling a paid booking (customer or admin) leaves it PAID with no refund path surfaced, contradicting the policy text.
- **P0** invented marketing claims on public pages (hard-coded "45+", "10+ years", "hundreds of five-star experiences", "certified", "dermatologist-trusted", "hospital-grade", 5.0 fallback rating, `@beautyempire` handle).
- **P0** production seed would create five fictional bookable staff.
- **P1** WCAG AA: 398 colour-contrast nodes (muted-rose text #A77B8D, white/75 on magenta), 210 label-in-name mismatches, invalid list markup, non-focusable scroll region, colour-only links; calendar uses `role=grid` without rows; link "tabs" use `role=tab`.
- **P1** `/staff/availability` horizontal overflow at 390 and 1440.
- **P2** no linter (added; 7 errors), no route-level loading states, every public page dynamic because the site layout reads the session.
