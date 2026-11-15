---
name: analytics-tracking
description: Analytics, conversion goals, and consent handling for any site. Use on every build to set up measurement and whenever a form, checkout, donation, or call action is added.
---

# analytics-tracking

## Setup

1. Tool from the brief; default to a privacy-friendly analytics tool (Plausible or similar) unless the client needs Google Analytics 4 for ads. Load it through one module so it can be swapped.
2. Consent: if the tool sets cookies or the audience includes regions that require it, show a consent banner that defaults to essential only and remembers the choice. Non-essential scripts load only after consent.
3. Events, named consistently across sites: `lead_submit` (form name), `call_click`, `booking_complete`, `purchase` (value, currency, order ID), `subscribe_start`, `subscribe_complete`, `donate_complete` (value, recurring), `chat_open`, `chat_handoff`.
4. Mark the primary action from the brief as the site's main goal.
5. Exclude staging and internal traffic.

## Done when

Each event fires once per action in testing; the main goal appears in the analytics tool; the consent banner blocks non-essential scripts until accepted; no analytics on staging.
