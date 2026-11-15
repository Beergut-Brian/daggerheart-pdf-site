# Review checklist: money, billing, auth, personal data

Request changes on any failure.

**Money**
- Amounts are integers in minor units; rounding happens once, at display.
- Every charge has an idempotency key tied to the business event (order ID, subscription + period), not a random value.
- A lock or unique constraint prevents two charges for the same event even if the job runs twice.
- Retries never repeat a side effect that already succeeded.
- Refunds reference the original charge and cannot exceed it.
- Dry-run mode exists for any scheduled billing job.
- Declines, approval-required, and provider errors each have a tested path.

**Auth and data**
- Every account route checks the caller owns the resource.
- Tokens expire; refresh is handled; logout invalidates.
- Personal data collected is listed in the privacy policy and is deletable on request.
- Card data never touches the server (provider-hosted fields only).

**Code**
- Input validated at every route boundary.
- Secrets from environment; none in code, tests, or fixtures.
- Errors fail closed (no charge, no order) and are logged with correlation IDs.
- Tests cover failure cases, not only the happy path.
- Webhook signatures verified; handlers idempotent.
