# Brand: Beauty Empire (kept — not renamed)

The name, palette and typography are the client's own brand from the specification. replica-brand was used only to
**strengthen consistency**; steps 1–4 (naming, trademark checks, new palette, logo brief) do not apply and were skipped on purpose.

## Identity (unchanged)
- Name: **Beauty Empire** · tagline "Beauty. Confidence. You."
- Accent: Rich Magenta `#C21870` / Deep Magenta `#9D145A`; surfaces white, ivory `#FFF9F7`, blush `#FCE7F0`; charcoal text.
- Type: Bodoni Moda (display, headings, prices) + Inter (UI). Both OFL, self-hosted by `next/font`.
- Changes for accessibility only: text-role rose `#8A5A6E` (was `#A77B8D`), input border `#A8879A`, WhatsApp action green `#177A43` — see `design/tokens.json`.

## Voice — warm, precise, unhurried
| word | means | does not mean |
| --- | --- | --- |
| warm | "We'd love to welcome you", second person, kind | gushing, emoji, exclamation marks everywhere |
| precise | real times, real prices, what happens next | vague promises, superlatives, invented figures |
| unhurried | calm sentences, one idea each | pushy urgency ("only 2 left!") |

Do / don't:
- Do "Your slot is held for 30 minutes." — Don't "Hurry, book now!!"
- Do "Rated 4.8 from 6 verified reviews." — Don't "Loved by thousands."
- Do "We couldn't reach the salon's server. Press Confirm again — you won't be double-booked." — Don't "Something went wrong."
- Do "Specialists for every service." — Don't "Certified experts" (unless the salon supplies certificates).
- Do "Book Your Appointment" / "Book Now" / "Confirm booking" — Don't mix "Reserve", "Schedule", "Buy".

## CTA vocabulary (audited, consistent)
Primary: **Book Appointment** (nav) · **Book Your Appointment** (hero) · **Book Now** (cards/offers) · **Confirm booking** / **Confirm & pay ₹X** (wizard).
Secondary: **Explore Our Services**, **View Details**, **Book Your Bridal Consultation**, **Add to calendar**, **Book these services again**.

## Surfaces checked by eye
- Page titles: `%s · Beauty Empire` template; home has an absolute title. ✔
- Favicon `public/icon.svg`; new `apple-icon` (180px BE monogram, PNG via `next/og`). ✔
- OG image `opengraph-image.tsx` (1200×630, brand colours, AA-safe secondary text). ✔
- Email templates: brand header, magenta CTA, all secondary text moved to `#8A5A6E`. ✔

## Sweep
`replica/brand.json` lists removed claims and retired colours. `sweep.py` over tracked source: clean (only two code comments that document the retired values). Generated `.dev-mail/` files are ignored artefacts.
