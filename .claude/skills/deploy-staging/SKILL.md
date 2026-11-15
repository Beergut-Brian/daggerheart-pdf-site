---
name: deploy-staging
description: Build and deploy to a staging or preview environment so Kaden can review. Use at the end of every build phase and for every change. Never deploys to production.
---

# deploy-staging

Production deploys are Kaden's. This skill ends at staging.

> **WordPress + Bricks jobs:** there is no staging host. "Staging" is the local site in the sandbox, reviewed through screenshots. At job end, `wordpress-bricks` produces a WPVivid backup for Kaden to restore on Cloudways himself. Never connect to Cloudways or any live site.

## Steps

1. Confirm the branch is green: lint, tests, build.
2. Target from the brief: a hosting preview (Vercel/Netlify preview, DigitalOcean staging app, or a Docker Compose stack on a staging host). If none is given, run the production build locally and expose it through the sandbox's preview mechanism; record the URL.
3. Environment: staging uses test keys only. Verify no variable name containing `LIVE`, `PROD`, or `SECRET_KEY_LIVE` is set. Email goes to a test inbox or a provider sandbox.
4. Migrations: run database migrations on staging before switching traffic. Keep the down migration ready. Supabase: a table created in `public` after 2026-10-30 gets no Data API grants by default (PostgREST answers 42501 "permission denied"), so every migration that creates a table enables RLS and carries its own explicit `grant` lines for the roles that need it (usually `authenticated` and `service_role`; `anon` only for an intended public read). Smoke-test the new table through the client, not only in SQL.
5. Smoke test: home page, one deep page, one form or flow, in test mode.
6. Write the preview URL, the commit hash, and the smoke-test result into `../status.md` and, when the job is done, `../report.md`.

## Pipeline (set up in phase 0 when the brief allows)

On push to a `job/*` branch: install, lint, test, build, deploy preview, post URL. On merge to `main`: deploy to staging, run migrations, smoke test. Production deploy is a manual step requiring Kaden's approval.

## Never

Live keys, production hosts, DNS changes, real customer email, real charges.
