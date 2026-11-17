# Launch plan (local salon) — not executed; deployment is out of scope for this pass

Before showing to real customers (owner tasks, need the client's accounts and content):
1. Replace placeholder content: salon address/phone/WhatsApp/map, real photos (gallery, services, staff), real prices, real staff.
2. Production accounts in the salon's name: hosting, PostgreSQL, Resend (verified domain), Cloudinary, Upstash, optional Razorpay (KYC).
3. Legal: owner reviews Privacy Policy and Terms (ideally a local lawyer, DPDP Act 2023).
4. Seed production with `SEED_DEMO_DATA=false` (verified: creates no sample staff, offers, gallery or bookings).
5. Error monitoring and uptime checks.

Soft launch:
- Google Business Profile with the booking link; Instagram bio link; WhatsApp Business greeting with the booking link.
- First 20–30 bookings: ask each customer for feedback in person; only then publish real reviews (the app only accepts reviews from completed appointments).
- Validate the positioning in `fixes.md` against those first customers before using it in ads.
