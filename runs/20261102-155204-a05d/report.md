# Factory report: Wheels2Go
- Status: **success**
- QA stages: build=ok, unit=ok, e2e=ok
- Security findings: 0
- Fix iterations: 2/5
- Tokens: 501,745 billed at full rate / 1,500,000 budget, plus 543,097 read from prompt cache (~10% price)
- Cost: $3.37 / $10.00 budget
- Deployed: file:///Users/khongorzul/Documents/personal/lca-lc-foundations/notebooks/module-4/web_factory/runs/20261102-155204-a05d/app/dist/index.html
- Agent-written lines: 5,213 across 26 files; human interventions: 0

## Acceptance tests
| Id | Requirement | Result |
|---|---|---|
| TR-1 | Owner creates a listing with location and it appears immediately in the Renter catalog | PASS |
| TR-2 | Each filter removes non-matching cars in real time | PASS |
| TR-3 | Booking price calculation: Days x Daily Rate + Cleaning Fee | PASS |
| TR-4 | Renter request appears in owner queue; owner clicks Approve and the status shows Confirmed in both views | PASS |
| TR-5 | Owner clicks Decline and the status shows Cancelled in both views | PASS |
| TR-6 | Owner dashboard overview, pagination and persistence on seed data | PASS |

## Tokens by agent
| Agent | Model calls | Tokens | Cost |
|---|---|---|---|
| pm_agent | 1 | 17,336 | $0.281 |
| architect_agent | 1 | 26,245 | $0.278 |
| designer_agent | 1 | 9,408 | $0.002 |
| foundation_coder | 1 | 28,975 | $0.139 |
| coder_agent | 15 | 491,520 | $1.703 |
| unit_test_writer | 5 | 131,159 | $0.023 |
| e2e_test_writer | 2 | 52,982 | $0.563 |
| translator_agent | 4 | 26,854 | $0.009 |
| fixer_agent | 5 | 260,363 | $0.374 |

## Lessons saved to memory
- When a spec says optional fields have preselected defaults, unit tests should expect those defaults and only treat free-text required fields as empty. Check the spec's defaults before asserting that a field starts blank.
- Don't use display:none for a contract test-id element at a viewport the tests visit. Hide it visually with sr-only so it stays visible to assistive tech and tests. In tests, open a collapsed menu before asserting on controls inside it.

## Features (E2E test per feature)
| Id | Role | Feature | Result |
|---|---|---|---|
| F-1 | Car Owner, Renter | Passwordless quick login and role switching | PASS |
| F-2 | Car Owner | Car listing creation | via TRs |
| F-3 | Car Owner | Pickup/drop-off location management | via TRs |
| F-4 | Car Owner | My fleet: edit, availability and delete | PASS |
| F-5 | Renter | Car discovery grid | PASS |
| F-6 | Renter | Search and real-time filtering | via TRs |
| F-7 | Renter | Home hero, makes strip, top picks and FAQ | PASS |
| F-8 | Renter | Booking checkout with automatic price calculation | PASS |
| F-9 | Car Owner | Incoming booking requests queue | via TRs |
| F-10 | Car Owner | Owner dashboard overview | via TRs |
| F-11 | Renter | My bookings | PASS |
| F-12 | Renter | Saved cars | PASS |
| F-13 | Car Owner, Renter | Persistence, formatting and responsiveness | PASS |

## Files
- e2e/acceptance.spec.ts
- e2e/features.spec.ts
- src/App.tsx
- src/components/CarCard.tsx
- src/components/CarDetails.tsx
- src/components/CarForm.tsx
- src/components/Footer.tsx
- src/components/Header.tsx
- src/components/LoginScreen.tsx
- src/components/OwnerPages.tsx
- src/components/RenterHome.tsx
- src/components/RenterPages.tsx
- src/data/seed.json
- src/i18n/mn.json
- src/lib/carForm.test.ts
- src/lib/carForm.ts
- src/lib/filters.test.ts
- src/lib/filters.ts
- src/lib/labels.test.ts
- src/lib/labels.ts
- src/lib/pricing.test.ts
- src/lib/pricing.ts
- src/lib/store.test.ts
- src/lib/store.ts
- src/theme.css
- src/types.ts
