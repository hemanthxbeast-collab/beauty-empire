# Product improvement (replica-entrepreneur)

## Sample size: 0 reviews — stated plainly

Beauty Empire is an unreleased single-salon product. There is no "original" app, no App Store / Play / G2 / Reddit
presence and no customer reviews to read, so `replica/reviews.csv` and `feedback.md` are intentionally **not** created.
Nothing below is presented as user research; no quotes, ratings or counts were invented.

The improvements below come from walking the product's own flows (recon `F01–F07`) as each role and noting friction,
plus the operational needs of a salon front desk. They are hypotheses to validate with the salon's first real customers.

## 1. What hurts (observed in the product's own flows)

| problem | where | evidence |
| --- | --- | --- |
| Booking could be double-submitted into two professionals | F01 | integration test (fixed, P0) |
| After booking there was no way to put the appointment in a calendar | F01 → S10 | missing control |
| Rebooking a favourite service meant starting the wizard from scratch | F03 → S16 | "Book again" only on cancelled bookings |
| Admins had no single view of *today* | F04 → S21 | dashboard showed KPIs and charts only |
| Rescheduling could not offer times overlapping the customer's own current slot | F03 | availability ignored the booking being moved |
| Mobile booking hid the running total below the fold | F01 @390px | layout review |

## 2. What is missing

| feature | value |
| --- | --- |
| Add to calendar (.ics) on confirmation and account | fewer no-shows; works with Google / Apple / Outlook |
| One-click rebook of completed services (same professional) | retention |
| Admin "today's schedule" | front-desk operations |
| Deposit for bridal bookings | protects long bridal slots (not built — needs salon's policy decision) |
| Waitlist for full days | could (not built) |
| SMS/WhatsApp Business API reminders | needs a WhatsApp Business account (not built) |

## 3. Unsolved jobs (positioning candidates)

- **Bridal journey as a project**, not a single appointment: trial → pre-bridal rituals → wedding day (packages exist; a timeline view does not).
- **Front desk on a phone**: staff/admin dashboards are now usable at 390px, which most salon software is not.

## Fix plan (implemented in this pass)

| fix | size | status |
| --- | --- | --- |
| Idempotent booking + one-customer-one-chair rule | S | done |
| Add to calendar (`/api/bookings/[ref]/calendar`, token/owner/admin) with 2-hour alarm | S | done |
| "Book these services again" (with the same professional) on completed visits | S | done |
| Admin "Today's schedule" panel | S | done |
| Reschedule shows times overlapping the customer's own booking | S | done |
| Sticky mobile total in the booking bar | S | done |
| Bridal deposit, waitlist, WhatsApp Business reminders | M–L | not built: need the salon's decisions / accounts |

## Angle (recommendation)

> For brides and regulars in the neighbourhood who are tired of phoning to check a slot,
> Beauty Empire shows real availability and confirms in under a minute — and the bridal studio plans the whole journey.

Evidence: product flow analysis only (0 reviews). Validate with the first 20–30 real bookings before using in marketing.
