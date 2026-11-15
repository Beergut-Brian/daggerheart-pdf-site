---
name: integrations
description: The one pattern for connecting any outside service: payments, POS or inventory systems, shipping carriers, tax, CRM, booking tools, donation processors, email, LLM providers. Use whenever the site must read from or write to a third-party API. Includes the review checklist for payment and billing code.
---

# integrations

Every outside service is replaceable by writing one adapter. Nothing else in the codebase knows the vendor exists.

## Pattern

```
packages/integrations/<service-type>/
  interface.ts      # what the site needs, in the site's terms
  mock.ts           # in-memory implementation for tests and local dev
  <vendor>.ts       # the real adapter
  <service-type>.test.ts  # runs against mock and real-in-test-mode
  README.md         # rate limits, webhooks, retries, key setup
```

1. Define the interface from the site's needs, not the vendor's API. Example, inventory: `listItems`, `getStockAndPrices(skus)`, `parseStockEvent(payload)`, `recordSale(lines)`.
2. Write the mock first. Build the feature against the mock.
3. Write tests against the interface. Failure cases are required: timeout, rate limit, invalid response, partial failure.
4. Write the vendor adapter. Run the same tests against it with test credentials.
5. Register the adapter through configuration (environment variable or module config), so swapping vendors changes config plus one file.

## Rules

- Match records across systems by business keys (SKU, email, external order ID). Never store another system's internal ID as the primary link.
- Every outbound call is logged with service, operation, duration, result, and a correlation ID. Every inbound webhook is logged raw before processing.
- Idempotency: every write that could be retried carries an idempotency key. Webhook handlers are safe to receive twice.
- Rate limits: read the vendor's limit headers when they exist; back off before the bucket fills; queue work rather than dropping it.
- Secrets from environment only. Test and live keys never in the same file.
- Webhooks verified by signature. Unverified payloads are rejected and logged.
- Sync jobs reconcile: a scheduled job compares both sides and corrects drift, logging each correction with its source.

## Reading `references/`

- `references/service-types.md`: typical interfaces for payments, inventory/POS, shipping, tax, CRM, booking, donations, email, LLM.
- `references/review-checklist.md`: what `reviewer` checks on money and auth code. Read it before writing payment code, not after.
- `references/sms-a2p-10dlc.md`: before building any SMS opt-in (Twilio A2P 10DLC): what the live site, the Privacy Policy and the SMS Terms page must show so the campaign is approved on the first submission, and the submission doc to ship.
