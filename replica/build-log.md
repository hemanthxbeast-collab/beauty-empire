# Build log (replica-build, applied to an existing app) — 2026-11-17

Definition of done per screen: states (filled / empty / loading / error / no permission), 390 + 1440 px, keyboard,
no console errors, features.csv updated. Evidence: `audit-after.json` (overflow + axe at 390/768/1440),
E2E guard (fails on console errors / 5xx), empty-production check (scratch DB seeded with `NODE_ENV=production`).

| ID | screen | status | states verified / changed in this pass |
| --- | --- | --- | --- |
| S01 | Home | done | live facts only; sections hide when empty (offers, reviews, Instagram, **gallery — fixed**); empty-production renders without dead sections |
| S02 | About | done | team hidden when no staff; invented history removed |
| S03 | Services | done | empty search state; category counts AA |
| S04 | Service detail | done | real 404 for unknown slug (public loading UI deliberately not added) |
| S05 | Bridal | done | packages/gallery sections hide when empty; stock-photo heading made honest |
| S06 | Gallery | done | empty gallery message (**fixed** wording), filter as toggle buttons, lightbox axe-clean |
| S07 | Offers | done | empty state |
| S08 | Contact | done | form errors linked; WhatsApp AA |
| S09 | Booking wizard | done | **no-staff empty state (fixed dead end)**, loading skeleton, offline error + retry, conflict → refreshed times, submit network failure, double submit, mobile sticky total |
| S10 | Confirmation | done | pending / confirmed / awaiting payment / cancelled / 404 without token; add to calendar |
| S11–S13 | Auth pages | done | errors (axe-clean), rate-limited, unverified, invalid/expired reset token |
| S14–S18 | Customer area | done | empty lists, loading skeleton, not-owner → not found, cancel/reschedule/review dialogs, **delete account** |
| S19–S20 | Staff | done | empty day, loading, availability overflow fixed, forbidden admin |
| S21 | Admin dashboard | done | **today's schedule** + empty state |
| S22–S26 | Admin sections | done | filters, empty states, refund-due badge, forms with linked errors |
| S27 | Errors | done | forbidden, not-found, error boundary |

Harder than expected: the booking "one person, one chair" rule needed a second advisory lock (customer → staff order) and an
idempotency check under that lock, discovered by a failing concurrency test.
