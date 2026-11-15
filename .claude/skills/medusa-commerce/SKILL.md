---
name: medusa-commerce
description: How to build a store on Medusa v2 with a Next.js storefront: repo setup, modules, workflows, API routes, Stripe payments, tax and fulfillment providers, admin customizations, catalog import. Use for any ecommerce job on Medusa, and read before touching apps/backend.
---

# medusa-commerce

Medusa is the only system the storefront or a future mobile app talks to. Outside services plug into Medusa through modules and providers.

## Setup (phase 0)

- Create with `npx create-medusa-app@latest`, accepting the storefront. Result: `apps/backend` and `apps/storefront`. Do not start from archived starter repos.
- Add `packages/` for shared code: API client, types, design tokens, domain logic the storefront and apps both need.
- Install Medusa's agent skills: `npx -y skills add medusajs/medusa-agent-skills --skill '*' --yes`. Read them for module, workflow, and provider specifics. Medusa's docs index is at `docs.medusajs.com/llms.txt`.
- Node 20.19+ or 22.12+, PostgreSQL, Redis in production.

## Architecture rules

- Business logic lives in Medusa **workflows** with compensation steps. API routes validate input and call a workflow; nothing else.
- Nothing a mobile app would also need goes in the Next.js server code.
- Custom API routes are versioned (`/store/v1/...`) and only change in backward-compatible ways.
- Outside services are reached only through their module's interface (see `integrations`).
- Every workflow ships with an integration test in the same change.
- Products match across systems by SKU.

## Building blocks

| Need | Medusa piece | Notes |
| --- | --- | --- |
| Card payments | Payment provider (`@medusajs/medusa/payment-stripe`) | Enable per region in admin; register Stripe webhook; storefront uses Stripe's hosted card fields |
| Saved cards for later charges | `setup_future_usage: "off_session"` on first payment; `off_session: true, confirm: true` on later charges | See `recurring-billing` |
| Sales tax | Custom tax provider | Follow Medusa's provider pattern (Avalara guide is the model); check community plugins' age before relying on them |
| Carrier shipping | Fulfillment provider | Medusa's ShipStation guide; sum variant weights, so every variant needs a weight |
| Pickup and local delivery | Manual fulfillment provider | Zone by postal code; printable lists per delivery day |
| Inventory sync with a POS | Custom module + scheduled job + webhook route | Polling is primary; webhooks accelerate; reconcile job logs drift; safety buffer per SKU |
| Transactional email | Notification module (Resend guide) | Templates by event name |
| Admin screens | Admin UI extensions | Widgets and routes for custom data |

## Catalog import

One-time import script creates products by SKU with prices from the source system. Fields the source lacks (weights, images, web descriptions, attributes) are a data-entry task: produce a spreadsheet template, import it, and keep a product unpublished until required fields are filled. Shipping rates depend on weights.

## Storefront

Keep the starter's data layer (cart, checkout, account calls). Strip its styling and rebuild from the design system. Pages per `site-profiles/references/ecommerce.md`. Checkout: address → shipping or pickup → payment → review → confirmation. Free-shipping threshold applied as a shipping option rule, visible early in cart.

## Hosting (self-hosted)

One Medusa instance in server mode, one in worker mode (scheduled jobs and events), managed PostgreSQL with backups, managed Redis, S3-compatible storage for images, the storefront beside them. A deploy pipeline builds, runs migrations, restarts server and worker. Alerts on server down, worker down, and daily job not run. The worker alert matters most: a stopped worker means no renewals and no syncs.

## Done tests

Per phase in `site-profiles/references/ecommerce.md`.
