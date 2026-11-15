---
name: project-intake
description: Run first on every website job, before planning or any code. Turns brief.md into a site profile, a phase plan, and the list of skills and sub-agents the job needs. Use even when the brief looks complete.
---

# project-intake

## Steps

1. Read `../brief.md` and `../brief-source.md` if present.
2. Pick the site profile from `site-profiles`: ecommerce, local-service, nonprofit, brochure, or portfolio. If two fit, pick the one whose main visitor action matches the brief's goal.
3. Read that profile's reference file. It lists the default page set, the extra skills to load, and the "done when" tests.
4. Check the brief against the profile's required facts. List what is missing. Missing business rules (prices, delivery areas, service areas, donation tiers) block the plan; missing nice-to-haves become Decisions you make and record.
5. Decide whether `site-strategy` is needed (no site map or page plan in the brief → yes) and which `design-direction` mode applies (references only, approved pages to extend, or full Figma). Record both in status.md.
6. Take the platform and framework from the brief's "Platform / framework" line. Kaden always specifies it. If it is missing or unclear, stop and ask in Blocked; never choose a platform yourself. Within that platform, fill smaller stack gaps from the profile's defaults and record each as a Decision.
   - `WordPress + Bricks`: load `wordpress-bricks` now; it sets up the local site and installs the Bricks skills the other agents use. Profile defaults that assume a code stack (Next.js, components in code, a token lint rule) do not apply; use the Bricks equivalents that skill names.
7. Write the plan into `../status.md`: phases in dependency order, each with the sub-agent, the skills it uses, and its done test. Phases that touch different files can run in parallel; say which.
8. Set a spend plan: split the brief's budget cap across phases, heaviest to integrations and QA.

## Output

`status.md` filled in, with:
- Profile and stack
- Missing facts (as Blocked questions if they block)
- Phase plan with done tests
- Decisions made so far

Do not start any build work in this skill.
