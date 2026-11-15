---
name: asset-intake
description: Collect and organize everything a site needs from the client before design and content start: logos, brand files, photos, reviews, licenses, service lists, pricing, hours, contact details, existing accounts and logins. Use on every new site or redesign, right after the brief. Produces an asset checklist, an organized assets folder, and a list of what to request from the client.
---

# asset-intake

Missing assets stall builds late. Collect early and list the gaps.

## Steps

1. From the brief and site profile, build the checklist in `assets/CHECKLIST.md`: brand (logo files in vector, colors, fonts, usage rules), identity (legal name, DBA, address, phone, email, hours, service areas), proof (reviews with permission, testimonials, licenses, insurance, certifications, awards, years in business, warranties), content (service descriptions, team bios and photos, FAQs, policies), photos (jobs, team, premises, vehicles, before/after), accounts (domain registrar, DNS, hosting, Google Business Profile, analytics, social, email provider, CRM, scheduler).
2. Sort what the brief already provides into `assets/<category>/`. Rename files descriptively. Never alter originals; derived versions go in `assets/derived/`.
3. Verify: logo has a vector or high-resolution version; phone and address match the Google Business Profile; reviews have a source and permission; licenses are current.
4. Write `assets/REQUEST.md`: a client-ready list of what is still needed, grouped, with why each item matters and an acceptable fallback. Hermes can send it to Kaden to forward.
5. Record blockers: anything the launch set cannot proceed without goes in status.md Blocked.

## Rules

Logins and secrets are never stored in the repo; note where they live. Do not use photos or reviews without stated permission. Do not fabricate missing facts; mark them `[CONFIRM]`.
