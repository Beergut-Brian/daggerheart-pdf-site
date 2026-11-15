# Profile: ecommerce

Main visitor action: buy, or subscribe.

## Required facts from the brief
- Commerce backend and storefront framework (default: Medusa v2 backend, Next.js storefront from Medusa's starter)
- Payment processor and tax source
- Inventory source of truth (the store's POS, or Medusa itself)
- Shipping methods, pickup, local delivery, and their fees and thresholds
- Subscriptions or bundles: yes/no; if yes, billing cycle, lock and charge timing, retry policy, out-of-stock rule
- Product data gaps (weights, images, attributes) and who fills them
- Hosting target and email provider
- Launch plan (soft launch group, go-live criteria)

## Default pages
Shopping: home, category listing, search, product detail, cart.
Checkout: address, shipping or pickup, payment, review, confirmation.
Account: orders, addresses, saved payment methods, profile.
Subscription (if any): eligibility check, builder, review changes, overview, skip/pause, cancel.
Plus the shared defaults.

## Extra skills
- `medusa-commerce` for catalog, cart, checkout, payments, fulfillment, admin
- `integrations` for every outside service (POS, shipping, tax, email, LLM)
- `recurring-billing` if subscriptions or bundles
- `ai-chat-assistant` if the brief includes chat or recommendations

## Extra agents
`integrations` and `reviewer` are mandatory. Reviewer gates every payment, renewal, refund, and auth change.

## Phase order
0 Foundation (repo, shared packages, CI, staging, test payments, email) →
1 Storefront (tokens, components, shopping, checkout, account) →
2 Catalog and inventory (import, adapter, sync, data entry list) →
3 Shipping and tax →
4 Subscriptions and bundles (if any) →
5 Chat (if any) →
6 Launch readiness (backups, monitoring, email templates, terms, soft launch group).
Phases 1 and 2 can run in parallel.

## Done tests
- A test order completes on staging and its confirmation email arrives (phase 0)
- Every page uses the design system and a one-time purchase works (phase 1)
- An inventory change in the source system shows on the site; an online order lowers source stock; the reconcile job reports no drift (phase 2)
- Checkout shows a live rate, pickup, and correct tax; free-shipping threshold applies (phase 3)
- Renewal tests pass for success, decline, every retry, approval needed, replacement, skip, pause, and a double run; ineligible addresses cannot subscribe (phase 4)
- Scripted chat conversations pass and chat can build a bundle and hand off to checkout (phase 5)
- A first real cycle completes cleanly for the soft-launch group (phase 6)

## Risks to design against
Double charges, selling stock that is gone, rate-limited sync, AI-written bugs in payment paths, saved-card declines, a down worker nobody notices, shipping cost surprises. Each needs a named mitigation in status.md.
