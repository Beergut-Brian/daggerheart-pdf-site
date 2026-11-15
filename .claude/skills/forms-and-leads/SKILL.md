---
name: forms-and-leads
description: Contact, quote, booking, volunteer, newsletter, and donation-handoff forms, with validation, spam protection, routing, notifications, and conversion tracking. Use for any form on any site, especially local service and nonprofit sites where forms are the main conversion.
---

# forms-and-leads

A form is a conversion. Treat its delivery like a payment: tested, logged, confirmed.

> **WordPress + Bricks jobs:** forms use WS Form PRO (Kaden's stack), embedded in Bricks; not the Bricks form element unless the brief says so. Validation, spam protection, routing to a test inbox, and conversion tracking below still apply.

## Build

1. Fields: only what the business needs to respond. Each field has label, help text if needed, validation rule, and error message (from `content/microcopy.md`).
2. One shared form component per form type; page-specific context goes in hidden fields (service, page, campaign), not in separate forms.
3. Validation on client and server with the same rules. Server is authoritative.
4. Spam: honeypot field plus a time-to-submit check; add a privacy-friendly challenge only if spam persists. Rate-limit by IP.
5. Routing: submission → stored record → notification to the recipients in the brief (email, SMS, or CRM via `integrations`) → confirmation to the visitor (on-page always, email if an address was given).
6. Failure: if the notification fails, the record is still stored and an alert fires. Never lose a lead silently.
7. Tracking: fire a conversion event on success (`analytics-tracking`).

## Types

- **Quote request**: service, location (check against service area), timing, contact, photos optional. Auto-reply with expected response time.
- **Booking**: through the brief's scheduler via `integrations`, or a request form if none. Show availability only from the tool.
- **Volunteer**: interests, availability, contact, any screening question from the brief. Route to the coordinator.
- **Donation handoff**: amount tiers, one-time/recurring toggle, then hand to the processor's hosted or embedded form. Receipt language from the brief.
- **Newsletter**: email only, double opt-in if the list provider requires it.
- **Click-to-call**: `tel:` link in the header on mobile; tracked as a conversion.

## Done when

Each form passes QA's three submissions (valid, invalid, failure), delivers to the test recipient within a minute, shows confirmation, blocks the honeypot, and fires its conversion event.
