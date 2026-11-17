# Landing page audit (replica-launch, adapted to a salon website)

Not applicable and deliberately skipped: SaaS pricing tiers (`pricing.md`), App Store / Play listing (`listing.json`,
`listing.py`) — Beauty Empire is a single salon's website. Salon prices are shown per service from the database.

## Funnel: can a first-time visitor answer these within one screen or one scroll?

| question | where it is answered | status |
| --- | --- | --- |
| What is Beauty Empire? | Hero headline + line under it ("beauty, elegance and self-care"), logo "Salon · Bridal Studio" | ✔ |
| What services exist? | Hero facts (live service count), category chips + 8 featured cards, Services page with search | ✔ |
| Why premium? | Editorial design, "Why Beauty Empire" commitments (no invented claims) | ✔ |
| Bridal offering | Hero "Bridal Studio" link card, dark Bridal section, dedicated page with packages + consultation form | ✔ |
| How do I book? | **New** "Book in about a minute" 3-step section + every CTA → `/book` | ✔ (added) |
| Where is it? | **New** "Find us" in hero facts → contact section with map, hours, directions | ✔ (added) |
| Is it open now? | **New** "Open today · hours" in hero facts (from Settings) | ✔ (added) |
| How do I contact? | Floating WhatsApp, contact section, footer phone/email | ✔ |

## Proof — honest only
- Rating shows only when real approved reviews exist, with the count ("4.8 · 6 verified reviews"); hidden otherwise.
- Testimonials section renders only approved reviews from completed appointments (customer first name + initial).
- Removed: years in business, "hundreds of five-star", "certified", "dermatologist-trusted", "hospital-grade", fake handle, JSON-LD aggregate rating.
- Not added (by rule): press logos, "trusted by", customer counts.

## CTA hierarchy
One primary action everywhere: **Book** (magenta). Secondary: explore services, bridal consultation, WhatsApp.
Mobile: sticky header CTA, floating WhatsApp, sticky booking action bar with running total inside the wizard.

## Contrast
All landing colours come from `design/tokens.json` (0 AA failures); axe on `/` at 390 and 1440 px: see `audit-after.json`.
