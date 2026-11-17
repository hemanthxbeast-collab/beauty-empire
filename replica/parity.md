# Parity / quality diff: Beauty Empire — CURRENT (`ae2cdd1`) → IMPROVED (`improve/replica-audit`)

There is no external original. "Parity" = implementation vs the Beauty Empire specification (`features.csv`, authored
from the spec during recon — so it is a checklist we wrote, not an independent benchmark). Every number below was measured.

## Scores

| measure | before | after | evidence |
| --- | --- | --- | --- |
| Feature parity (must 3 / should 2 / could 1) | **84.3** | **100.0** | `parity.py features-before.csv` / `features.csv` |
| Must-haves done | 37 / 48 | 48 / 48 | same |
| axe WCAG 2.1 AA violation nodes — before: 81 page loads / 54 axe scans; after: 126 page loads / 126 axe scans (more routes, all 3 widths, 4 roles) | **623** | **0** | `audit-before.json` / `audit-after.json` |
| …colour contrast | 398 | 0 | |
| …label-in-name mismatch | 210 | 0 | |
| …list markup / scroll region / colour-only links | 15 | 0 | |
| axe on interactive states (wizard steps, errors, dialogs, lightbox, admin detail) | not measured | 0 serious/critical | `tests/e2e/a11y.spec.ts` |
| Token contrast pairs failing AA | 5 / 25 | 0 / 28 | `contrast.py design/tokens-before.json` / `tokens.json` |
| Pages with horizontal overflow (390/768/1440) | 2 | 0 | audit |
| Empty production database (no staff/offers/gallery) | not tested | all public pages 200, 0 console errors, no dead ends | scratch DB + production build (`improvement-log.md`) |
| Non-200 pages in audit | 0 | 0 | audit |
| ESLint errors | 7 (no linter configured) | 0 (6 RHF compiler warnings) | `npm run lint` |
| Vitest | 58 passed | 64 passed | `npm test` |
| Playwright E2E (prod build, desktop + Pixel 7) | 29 passed | 44 passed, 1 skipped (mobile-only test on desktop) | `npm run test:e2e` |
| Known S1 bugs open | 3 (unknown at baseline) | 0 | `bug-report.md` |

Feature parity of 100 means every spec row is implemented and tested; it does **not** mean production-ready
(real content, real provider accounts and a manual screen-reader pass are outside the matrix — see verdict).

## Layout diff (before → after, same viewport, same data; `imgdiff.py` layout mode)

Intentional redesigns score low; unchanged screens score high. Used here to confirm *where* structure changed.

| screen | score | reading |
| --- | --- | --- |
| Home 390px | 73.9 partly | hero facts rebuilt (live data), blobs removed — see `diffs/home-mobile-before-after.png` |
| Home 1440px | 33.0 different | hero facts, "why" list, how-booking-works section added (+3.1% height) |
| Booking 390px | 61.6 partly | mobile progress header replaces pill scroller |
| Bridal 1440px | 96.3 matches | blobs/radius only |
| Staff availability 390 / 1440 | 50.0 / 52.0 | overflow fixed, row layout reworked |
| Admin dashboard 1440 | 44.3 different | "Today's schedule" added above charts |
| Customer account 390 | 96.5 matches | 2-column stats only |

## Behaviour diff

| flow | before | after | keep / fix |
| --- | --- | --- | --- |
| F01 booking, happy path clicks | 9 | 9 | keep (date auto-advances) |
| F01 double submit, no preference | 2 bookings, 2 professionals | 1 booking (idempotent replay) | fixed |
| F01 availability request fails | error text, no retry | offline message + Try again | fixed |
| F01 slot taken at confirm | toast | back to times with fresh list | fixed |
| F01 confirmation | receipt | + Add to calendar (.ics) | added |
| Online pay after hold expiry | PAID on a cancelled booking + success email | reinstated if free, else refunded/flagged | fixed |
| F03 cancel a paid booking | money silently kept | auto refund / "Refund due" | fixed |
| F03 reschedule | own slot blocked the overlap | own booking excluded | fixed |
| F04 admin day | KPIs + charts | + today's schedule | added |
| Public 404 for unknown service | 404 | 404 (public loading UI deliberately not added) | keep |

## Verdict

**Shippable against the spec checklist** (all must-haves, parity 100, no open S1/S2) **and better than the baseline**
(entrepreneur fixes: idempotent booking, add-to-calendar, rebook, today view, refund handling).
**Not production-ready yet** for reasons outside the matrix: placeholder content, no real provider accounts tested
(Razorpay/Resend/Cloudinary/Upstash), CSP still allows inline scripts, no manual screen-reader pass.

## Next five
1. Load the salon's real content (photos, staff, prices, address/map) and remove stock imagery.
2. Test Razorpay (test mode), Resend and Cloudinary with the client's own keys on a staging deploy.
3. Manual NVDA/VoiceOver pass of booking and account flows.
4. Nonce-based CSP (drop `'unsafe-inline'` for scripts) — needs dynamic rendering trade-off decision.
5. Make public pages cacheable (move navbar session to the client) for performance at scale.
