# Profile: nonprofit

Main visitor action: donate, volunteer, or attend.

## Required facts from the brief
- Mission in one sentence and programs in plain language
- Donation processor (default: Stripe via a hosted or embedded form), one-time vs recurring, suggested tiers, tax-deductible status and EIN display
- Volunteer intake: form fields, who receives signups, any screening step
- Events: recurring or one-off, ticketing or RSVP, calendar source
- Impact proof: numbers that can be cited, with sources
- Board, staff, financials or annual report links, accreditation badges

## Default pages
Home, about (mission, team, financials), programs (one per program), donate, volunteer, events, news or stories, contact, plus shared defaults.

## Extra skills
- `forms-and-leads`: donation handoff, volunteer and newsletter forms, routing
- `seo-setup`: Organization/NGO schema, event schema
- `analytics-tracking`: donation and signup goals
- `integrations` for the donation processor, CRM (donor database), email list, and calendar

## Phase order
0 Foundation → 1 Design and pages → 2 Donation and volunteer flows → 3 Events and news → 4 QA and launch.

## Done tests
- A test donation completes in test mode, is recorded in the CRM or export, and sends a receipt with the organization's tax language
- Volunteer signup reaches the coordinator and the volunteer gets a confirmation
- Every program page states the problem, the program, and one way to help
- Recurring donation flow clearly shows the amount and frequency before confirmation
- Accessibility audit passes with no WCAG AA failures (nonprofits are often held to this)

## Patterns
Donate button in the header on every page; impact numbers near the donate CTA; stories over statistics on program pages; receipts and privacy page cover donor data handling.
