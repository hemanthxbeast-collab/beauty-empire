# Backend checklist (replica-backend) — Beauty Empire

Stack kept (Better Auth, Prisma/PostgreSQL, Razorpay — not Stripe, Resend, Cloudinary, Upstash). Each item checked against the code or by a command.

## Security checklist

| item | result | evidence |
| --- | --- | --- |
| Secrets only in env vars; `.env*` git-ignored; nothing in client bundles | **pass** | `git check-ignore .env`; grep of `.next/static` for secret values and DB URL: only variable *names* in help text / library env reader |
| Input validated on the server on every route | **pass** | every Server Action and route handler parses with Zod (`src/lib/validations/*`); Better Auth endpoints guarded by `before` hooks (sign-up, reset/change password, **update-user — added in this audit**) |
| Authorisation on every read and write, tested with a second user | **pass** | `require*` guards in every action/route; ownership-scoped queries; integration (other customer → NOT_FOUND, staff vs other staff → FORBIDDEN) + E2E (`authorization.spec`) |
| Rate limits on auth, sign-up and anything that sends email | **pass** | Better Auth DB limiter (sign-in 5/min, sign-up, reset, verification resend); app limiter on contact (sends email), booking (sends email), reviews, payments, uploads; `zz-rate-limit.spec` proves 429 |
| Webhooks verify signatures, store event id, idempotent | **pass** | HMAC over raw body, constant-time compare; `webhook_event` table recorded after success; `markOrderPaid` conditional update; tests `security.test`, `payments.test` |
| Uploads: size/type limits; served from a separate domain/bucket | **pass in production / dev exception** | 5 MB, magic-byte sniffing, random names; Cloudinary in production (refused without it); dev fallback writes to `public/uploads` (git-ignored) |
| No user data in URLs or logs | **partial** | booking links carry an HMAC token, not data. Admin booking/customer search puts the search term (may be an email/phone) in the query string — admin-only, internal; dev email outbox logs the recipient address (development only) |
| Dependencies audited | **pass** | `npm audit --omit=dev`: 0 vulnerabilities (2026-11-17) |
| Privacy policy lists every processor | **pass (fixed)** | now names hosting/DB, Resend, Razorpay, Cloudinary, Upstash |

## Auth
- Email sign-up with verification, reset (1 h tokens, sessions revoked), DB sessions in httpOnly cookies (Secure on https), sign-out. ✔
- Roles: CUSTOMER / STAFF / ADMIN, one guard per operation. ✔
- **Account deletion that actually deletes — added in this audit:** Better Auth `deleteUser` with password; customers only; refused while upcoming bookings exist; past bookings kept for accounts with name/email/phone/notes anonymised; reviews & profile cascade; notifications deleted. E2E `account-security.spec` checks refusal and that the user row is gone.

## Database
- Migrations checked in (4), applied by `prisma migrate deploy` (also in `vercel.json` build). ✔
- Access rule: authorisation in the data layer (no RLS) — tested with a second customer and a second staff member. ✔
- Seed: fictional people only; sample content never in production (verified). ✔
- Backups: depend on the managed host (Neon/Supabase daily backups) — **to confirm at deploy**.

## Payments (Razorpay, test mode until launch)
- Order amount from DB, checkout signature + API confirmation, webhook, idempotent capture, refund API. ✔
- Late capture after hold expiry: reinstate (respecting slot and one-customer rule) or refund. ✔
- **Not verified live:** no Razorpay test keys in this environment, so the actual Razorpay order/refund API calls have not run; only the code paths that do not need the API are tested.
- Policy note: any cancel/reject of an online-paid booking triggers a full automatic refund. The salon's cancellation-policy text is editable, but the refund rule is fixed in code.

## Email and jobs
- Resend from the salon's domain; dev outbox fallback. Reminder cron with claim column (no double send), hold release. Times UTC, displayed in Asia/Kolkata. ✔
- Retries / dead-letter: failed reminder sends are un-claimed for the next hourly run; no dead-letter table (acceptable at this scale).
