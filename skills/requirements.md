# Skill: requirements (PM agent)
- Turn the brief into a precise spec: every feature per role, each with testable acceptance criteria.
- Every requirement in the brief, including any line added to the usual prompt, becomes a feature with acceptance criteria and is covered by a test; never drop or water down a brief requirement because a skill describes a different default.
- Prefer concrete numbers and wording from the brief over paraphrase. Every formula in the brief becomes a feature with explicit data fields (e.g. "Days x Daily Rate + Cleaning Fee" means each listing stores a cleaning fee and checkout shows days, rate, fee and total).

## Test requirements
- If the brief defines test requirements (e.g. TR-1..TR-4), copy them exactly with their ids, steps and pass criteria.
- Otherwise write one TR per key capability (4-6, ids TR-1..), each with exact input values and the exact expected result, e.g. "3-day rental of an $85/day car with a $25 cleaning fee shows $280.00".
- Booking requests are handled with buttons labelled exactly "Approve" (sets Confirmed) and "Decline" (sets Cancelled), even when the brief only names the statuses: judges' tests click "Approve". Never label them "Confirm", "Accept" or other synonyms.
- Role-based products get a login step: a test that says "log into the Owner view" logs in as the seeded owner through the login screen.
- Login is a passwordless quick-login screen (one card per role). No email/password authentication, no sign-up and no stored passwords unless the brief explicitly asks for accounts: they add scope, slow the run and put credential literals into code and tests.
- Always cover: creating an item and seeing it immediately in the other role's catalog with all its details; each filter removing non-matching items in real time; every price calculation with a worked example; a status change made by one role showing in both roles' views.

## Seed data
- If the brief contains a seed dataset, copy it verbatim into seed_data_json.
- Otherwise write a realistic one: at least one user per role; 7-9 items (so the catalog paginates at 6 per page) whose attributes cover every filter (several makes, every option of each choice field, prices on both sides of typical thresholds, different locations); bookings in every status, including at least one Pending request for the seeded owner so the approval queue is never empty. The first owner (the one behind the owner quick login) owns most items (about two thirds, e.g. 5-6 of 8) and every seeded booking request, so the demo owner's fleet, dashboard and approval queue are full; the other owners own the remaining 2-3 items only so the catalog has variety. Seeded bookings belong to the other renters only: the first renter (the one behind the renter quick login) starts with no bookings, so a new user's own trips are never mixed with demo data. Every seeded item fills every attribute (no missing or null fields). Use https://images.unsplash.com photo URLs for images. Include a few locations in Mongolia (e.g. Ulaanbaatar city centre, Chinggis Khaan International Airport) alongside international ones.

## Short briefs
A one-line brief still needs a complete product. Fill the gaps with what the leading product in that category does (e.g. a rental marketplace has listings with location, search + filters, date-based checkout with a fee breakdown, and an owner approval queue), and state each assumption in the feature description. Give items every attribute shoppers compare in that category (specs, fuel/energy type, transmission or equivalent choice fields, year, capacity, price, fees, location, image) and make the choice fields filterable. For vehicles that means at least: make, model, year, body type (Sedan, SUV, Hatchback, Pickup, Van, Coupe), fuel/EV type, transmission, seats, luggage (bags), odometer reading (km driven), mileage policy (unlimited or km/day), daily rate, cleaning fee, image and pickup location, and owners carry a rating (0-10) and review count (new owners have none), with body type, transmission and fuel type as filters.
- Category leaders also offer, and so should the spec: a photo hero with a search card that holds every filter and a live "Show results (N cars)" count, a strip of the makes in the fleet, a "Top picks this week" row of the highest-rated cars, sorting by price, pagination of the catalog (newest listings on page 1), a renter "Saved" list of hearted cars, an owner dashboard overview (pending requests, active rentals, earnings at a glance), dates that carry into checkout, and a short FAQ on pricing and approval. Write them as features with acceptance criteria.
- Bookings have a pickup date + time and a return date + time (times in 30-minute steps, default 10:00). Price days = the number of calendar days between the pickup and return dates (times do not change it), so a 3-day rental of an $85/day car with a $25 cleaning fee is always $280.00. The return must be on a later date than the pickup.
- Forms require only the fields the brief names; extra attributes are optional with defaults, so a user who types just what the brief mentions can always save.
- Location is something users must see, not just read: every card shows a clear location badge, and listing details and checkout show the full pickup address and pickup instructions as text. No embedded maps or other third-party widgets.

## Worked example (different domain; follow the pattern, not the content)
Brief: "Build StayShare, a two-sided P2P room rental platform with Host and Guest roles."
Spec (abridged):
- F-1 Host - Listing management: create/edit a room with title, city, neighbourhood, room type (Private/Shared), nightly rate, cleaning fee, image URL; toggle availability. AC: a new room appears immediately in the Guest catalog with a location badge.
- F-1b Host - Location setup: per-room check-in instructions, house rules and address guidelines, shown to the guest at checkout and in their booking.
- F-2 Guest - Discovery: grid of room cards (image, nightly rate, room type, location badge); filters by city keyword, max nightly rate, room type, all applied in real time.
- F-3 Guest - Checkout: pick check-in/check-out dates; breakdown shows nights, nightly rate, cleaning fee and total = nights x rate + cleaning fee, formatted $1,234.00; submitting creates a Pending booking.
- F-4 Host - Requests queue: incoming bookings with guest, dates, total and status badge; Approve -> Confirmed, Decline -> Cancelled.
- F-5 Guest - My bookings: list with status badges (Pending, Confirmed, Cancelled, Completed), updated as soon as the host acts.
- F-6 Host - Earnings: completed stays count and total revenue.
- TR-3: 3 nights at $120 with a $40 cleaning fee shows exactly $400.00. TR-4: host approves a Pending request; status shows Confirmed in both the host queue and the guest's bookings.
- Seed: 1 host, 1 guest, 5 rooms (3 cities, both room types, rates $60-$220, cleaning fees $20-$50), bookings: 1 Pending, 1 Confirmed, 1 Completed.
