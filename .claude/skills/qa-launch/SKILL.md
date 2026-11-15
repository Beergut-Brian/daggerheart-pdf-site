---
name: qa-launch
description: Testing and launch readiness for any site. Use after every build phase, after every change, and before staging or launch. Covers functional, responsive, accessibility, performance, forms, commerce flows, and the launch checklist.
---

# qa-launch

> **WordPress + Bricks jobs:** also run `bricks-quality-gate` and `bricks-browser-verify`, check that no element carries element-level styles that belong in a global class, that templates are locked for client editing, and that only plugins from the brief's stack are active.

## Test pass

Run against the local build, then again on staging.

1. Lint: no raw style values; type check; unit and integration tests pass.
2. Pages: every page at 390px, 768px, 1280px. Screenshot each. Compare to design.md section order.
3. Accessibility: automated scan (axe or equivalent) with zero violations; manual keyboard pass through navigation, forms, modals; screen-reader labels on icon buttons.
4. Performance: Lighthouse mobile on each page type; targets from the profile.
5. Links and assets: zero broken internal links, images, or downloads.
6. Forms: each form submitted three ways: valid, invalid (every rule), and failure (network off or server error). Spam protection active. Confirmation state shown. Notification delivered to the test inbox.
7. Flows, in test mode only:
   - Ecommerce: browse → add → cart edit → checkout with test card → confirmation page → confirmation email → order in admin. Repeat with pickup, with free-shipping threshold, and with a declined card.
   - Subscriptions: signup eligibility, builder, lock, charge, retry, replacement, skip, pause, cancel, per recurring-billing tests.
   - Local service: quote and booking flows, click-to-call link.
   - Nonprofit: one-time and recurring donation in test mode, receipt email, volunteer signup.
8. Error pages: 404 and 500 render with navigation and the design system.
9. Console: no errors or failed requests on any page.
10. Security basics: no secrets in the client bundle; HTTPS only; security headers set; admin not reachable without auth.

## Findings

`qa/findings.md`: severity (blocker, major, minor), page, steps, expected, actual, screenshot path. Blockers and majors go back to the responsible agent; re-test after fixes.

## Launch checklist (before Kaden's go)

- [ ] All blockers and majors closed
- [ ] Staging matches main
- [ ] Backups configured and a restore tested (if self-hosted)
- [ ] Monitoring and alerts on server, worker, and scheduled jobs
- [ ] Production secrets staged in the host's secret store, not in the repo
- [ ] Redirect map ready; old URLs tested
- [ ] Analytics and consent verified
- [ ] Legal pages confirmed by Kaden
- [ ] Rollback plan written in report.md
- [ ] `reviewer` approval recorded for all high-risk code
