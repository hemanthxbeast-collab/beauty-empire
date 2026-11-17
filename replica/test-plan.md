# Test plan — Beauty Empire

Flows from `recon.md`. Automation: Vitest unit (`tests/unit`), Vitest integration against real PostgreSQL
(`tests/integration`, test DB only), Playwright E2E on a production build (`tests/e2e`, test DB, desktop + Pixel 7).
Every E2E spec uses a guarded `test` that fails on browser console errors and any 5xx response.
Accessibility: axe WCAG 2.1 AA in `a11y.spec.ts` (interactive states) and `scripts/audit.mjs` (81 page×viewport scans).

## F01 Book an appointment
| id | case | type | where |
| --- | --- | --- | --- |
| F01-H1 | guest books, confirmation via private link | E2E | booking.spec |
| F01-H2 | signed-in customer books → appears in account | E2E | booking.spec |
| F01-H3 | server pricing incl. discount price, snapshots, IST time | integration | booking.test |
| F01-E1 | double click on Confirm → 1 booking | E2E + integration | booking-resilience.spec, booking.test "Duplicate submission" |
| F01-E2 | availability request fails (offline) → retry recovers | E2E | booking-resilience.spec |
| F01-E3 | 6 concurrent bookings, same staff/time → exactly 1 | integration | booking.test |
| F01-E4 | "no preference" concurrent → spread over free staff | integration | booking.test |
| F01-E5 | same customer, concurrent "no preference" → 1 booking | integration | booking.test |
| F01-E6 | idempotency key replay (sequential + concurrent) → same booking; mismatched contact refused | integration | booking.test |
| F01-E7 | DB exclusion constraint rejects overlap even bypassing app | integration | booking.test |
| F01-E8 | slot outside hours / past date / online pay disabled | integration | booking.test |
| F01-E9 | slots respect hours, leave, buffer, lead time, IST | unit | slots.test |
| F01-N1 | confirmation without/with wrong token → 404 | E2E | booking.spec |
| F01-M1 | mobile 390px: no horizontal overflow, sticky action bar | E2E | responsive.spec (Pixel 7) |
| F01-A1 | every wizard step incl. validation errors: no serious axe issues | E2E | a11y.spec |

## F02 Register / verify / sign in
| F02-H1 | register → blocked until verified → verify link → account → logout → login | E2E | auth.spec |
| F02-E1 | weak password + mismatch shown together | E2E + unit | auth.spec, validation.test |
| F02-N1 | wrong password → clear message | E2E | auth-recovery.spec |
| F02-N2 | repeated failed sign-ins → 429 | E2E | zz-rate-limit.spec |
| F02-N3 | anonymous → protected areas redirect; upload API 401 | E2E | auth.spec |

## F03 Manage a booking (customer)
| F03-H1 | cancel within policy | E2E + integration | booking.spec, booking.test |
| F03-H2 | request reschedule; add to calendar (.ics) | E2E | booking-resilience.spec |
| F03-N1 | cancel inside window refused | integration | booking.test |
| F03-N2 | another customer's booking → 404 / NOT_FOUND | E2E + integration | authorization.spec, booking.test |

## F04 Admin operations
| F04-H1 | confirm pending booking | E2E | admin.spec |
| F04-H2 | confirm → reschedule (other staff) → cancel, audited | integration | booking.test |
| F04-N1 | reschedule into a clash refused; invalid transitions refused | integration | booking.test |
| F04-H3 | every admin section renders | E2E | admin.spec |

## F05 Admin content
| F05-H1 | add service → visible on /services | E2E | admin.spec |
| F05-H2 | create offer → visible on /offers with computed price | E2E | admin-content.spec |
| F05-H3 | add gallery image → visible on /gallery | E2E | admin-content.spec |
| F05-H4 | create staff member | E2E | admin-content.spec |
| F05-H5 | reject review hides it publicly; approve restores | E2E | admin-content.spec |

## F06 Staff
| F06-H1 | staff dashboard + availability; admin pages forbidden; upload API 403 | E2E | authorization.spec |
| F06-N1 | staff cannot confirm/cancel; cannot complete other staff's booking | integration | booking.test |

## F07 Password recovery
| F07-H1 | forgot → email → reset → sign in | E2E | auth-recovery.spec |
| F07-N1 | invalid reset token refused | E2E | auth-recovery.spec |

## Payments (F01 online)
| P-N1 | forged signature → unpaid | integration | payments.test |
| P-N2 | signature for another booking → refused | integration | payments.test |
| P-E1 | amount mismatch refused; concurrent capture → paid once | integration | payments.test |
| P-E2 | abandoned hold released after 30 min | integration | payments.test |
| P-E3 | late payment, slot free → reinstated | integration | payments.test |
| P-E4 | late payment, slot taken → stays cancelled, refund flagged | integration | payments.test |
| P-E5 | cancelling a paid booking flags refund | integration | payments.test |
| P-N3 | cross-site order request 403; bad webhook signature 401; cron 401 | E2E | authorization.spec |
| P-U1 | HMAC verification (valid / tampered / wrong secret / body change) | unit | security.test |

## Not automated (manual / needs real accounts)
- Real Razorpay checkout popup, real Resend delivery, Cloudinary upload, Upstash limits — need the client's keys.
- Screen-reader walk-through with NVDA/VoiceOver (axe covers rules, not experience).
