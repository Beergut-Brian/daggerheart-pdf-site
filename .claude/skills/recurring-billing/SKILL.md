---
name: recurring-billing
description: Subscriptions, bundles, memberships, and recurring donations where the backend schedules each charge and the processor only charges a saved card. Use whenever a site charges customers on a schedule, builds a recurring order, handles failed payments, or needs skip/pause/cancel. Covers the renewal workflow, retries, out-of-stock replacements, and the required tests.
---

# recurring-billing

The backend owns the schedule and the amount. The processor stores cards and charges them. No processor "billing" product, so every rule below is yours to build and test. This is the highest-risk part of any build; the `reviewer` agent gates every change.

## Data model (adapt names to the brief)

- **Subscription**: customer, status (active, paused, past_due, canceled), cadence settings from the brief, next lock date, default payment method, delivery address and method.
- **Standing order** ("bundle", "plan", "pledge"): the current list of lines the next charge is built from. Editable until lock.
- **Period order**: one order and one charge per period, created only after a successful charge. Unique key: subscription + period.
- **Fulfillment(s)**: one or more per period order, with the lines assigned to each.

## The cycle (fill dates from the brief)

1. **Reminder**: N days before lock. Email the lines, estimated total at current prices, and any proposed replacements. Customer can still edit. First stock check runs here.
2. **Lock**: edits close. Final stock check. One charge for the period at current prices.
3. **Charge failed**: mark past_due, email a card-update link, alert the staff contact in the brief, schedule retries.
4. **Retries**: schedule from the brief, timed from the first failure (example: 30 min, 1 h, 1 d, 2 d, 5 d). After the last, pause the subscription.
5. **Approval needed** (bank asks the customer to confirm): email a link to complete payment on the site.
6. **Fulfillment**: only for paid period orders. A missed slot moves to the next.
7. **Customer actions**: edit standing order, skip a period, pause, resume, cancel, change card, change address, change fulfillment option. All through versioned API routes so apps share them.

## Out-of-stock replacement (if the brief wants it)

Rule: same category and attributes, in stock, priced at or below the original, so the total never rises without the customer acting. Proposed at the reminder; customer may change it until lock; a replacement made at the final check is not changeable. Notify every time.

## Must-haves

- **Idempotency**: charge idempotency key = subscription ID + period. Unique constraint on period order (subscription, period). A lock around the renewal job per subscription.
- **Dry run**: a mode that builds tomorrow's carts and totals and charges nobody. Run it before the first real cycle and after every change.
- **Pricing**: each period at current prices from the pricing source, not signup prices, unless the brief says otherwise.
- **Fees**: delivery or shipping recalculated each period; thresholds (free over $X) applied per period.
- **Eligibility**: service-area or plan checks at signup and again at lock (address may change).
- **Worker**: the renewal job runs in the background worker. Alert if the daily job did not run.
- **Logs**: every charge attempt, retry, replacement, and status change logged with reason and correlation ID.

## Required tests (all must pass before staging)

Success; declined card; each retry step; final failure → pause; approval-needed path; out-of-stock → replacement proposed → accepted; replacement rejected and changed; skip; pause and resume; cancel mid-period; address change to an ineligible area; price change between reminder and lock; **double run of the renewal job producing exactly one charge**; dry run producing zero charges.

## References

`references/schedule-worksheet.md`: fill it from the brief before writing code.
