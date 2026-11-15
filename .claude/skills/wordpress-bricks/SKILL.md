---
name: wordpress-bricks
description: Set up and build a WordPress + Bricks site through Bricks abilities over MCP. Use on every job whose brief says "WordPress + Bricks", at intake, and whenever an agent needs to know how to work on the local Bricks site, export it, or hand it off.
---

# wordpress-bricks

On this track the agents still do the work. The difference is the tool: they change the site through **Bricks abilities** (Bricks 2.4+, exposed by the MCP Adapter plugin), guided by Bricks' official skills, instead of writing code.

## Layout

- `../wp/`: the local WordPress install (not in git).
- `site/` (this repo): `CLAUDE.md`, `.claude/` (our skills plus the `bricks-*` skills), `.mcp.json` (the `bricks` MCP server), `exports/`, `docs/`.
- Local URL `http://localhost:<port>`; admin login in `site/.env.local` (gitignored). Never print it into status or reports.

## Setup (Leader, at intake; Brian may have run it already)

```bash
S=.claude/skills/wordpress-bricks/scripts/wp-site.sh
bash $S setup <job-dir> <port>         # tools, WordPress, Kaden's stack, Bricks abilities, MCP, bricks-* skills
bash $S serve <job-dir> <port>         # dev server: start as a background process and leave it running
```

Setup installs Kaden's stack from the host's `~/.local/share/ai-hub/wordpress-plugin-stack` (outside `/srv/ai-hub`; Leaders never read it) (Bricks, Automatic.css, Frames, Meta Box + Meta Box AIO, WS Form PRO and its add-ons, HappyFiles Pro, SchemaWP Pro, MCP Adapter), turns Bricks abilities on, grants the administrator Bricks' builder capabilities, writes `.mcp.json`, and installs the release-pinned `bricks-*` skills. License keys are not activated on local sites. The MCP server only works for agents started in `site/` (the folder with `.mcp.json`).

Check before any design work: `bricks-get-mcp-version` answers, and `bricks/get-design-context` is not refused. A "lacks bricks_full_access" refusal means setup's capability step did not run; rerun setup, do not route around it.

## How agents build

1. Read `bricks-start-here` first in every agent session, then the task skill:
   - design system: `bricks-design-systems`, `bricks-seed-design-system`, `bricks-naming-conventions`, `bricks-audit-design-system`
   - pages and sections: `bricks-html-css-to-bricks` (author semantic HTML/CSS, import it), `bricks-plan-from-brief`, `bricks-figma-to-bricks` when Figma frames exist
   - header, footer, templates: `bricks-headers-footers`, `bricks-templates-conditions`
   - dynamic content: `bricks-dynamic-data`, `bricks-query-loops`, `bricks-global-queries`; custom fields come from Meta Box (its abilities are on the same MCP server)
   - forms: WS Form PRO (its abilities are on the MCP server), embedded in Bricks
   - checks: `bricks-browser-verify`, `bricks-quality-gate`
2. Automatic.css owns the scales (spacing, type, colors). Reuse ACSS variables and classes; do not let `bricks-commit-site-foundation` or the importer generate a second spacing or type scale beside it. Configure ACSS through **SchemaWP** (in the stack): its 32 `schemawp_acss_*` abilities appear on the same `bricks` MCP server (admin user only). Every change is logged in its history and restorable, and named kits snapshot the whole ACSS config. Before any ACSS change: `get_site_context` and `get_config`, then `save_kit` with a name like "before <change>". Then `apply_patch`. A kit is also the reusable starter for the next Bricks job. ACSS's own WP-CLI is the fallback (local sites only):
   ```bash
   wp --path=../wp --allow-root acss settings get color-primary
   wp --path=../wp --allow-root acss settings set color-primary "#0f8b8d"   # regenerates ACSS CSS
   wp --path=../wp --allow-root acss settings export acss.json             # also: import, list, reset
   ```
   The designer records every ACSS setting it changes in `design.md` and exports the settings to `site/exports/acss-settings.json` at each phase end. `wp acss` is the only WP-CLI write allowed besides setup and exports. ACSS's Bricks globals sync makes its variables and classes appear in Bricks; check `bricks/get-design-context` after a change. Frames is ACSS's component library: prefer a Frames component over building the same thing.
3. Styling goes on global classes and components, never element-level settings. Reuse before creating; never force duplicate names.
4. Every broad write: readback (`bricks/get-page-elements`, summary) plus screenshots at 1280 and 390 (Playwright against the local URL). A write response alone is not proof.
5. Destructive abilities (delete, replace existing) need a readback and restore plan; global design resources have no revisions, so export first.
6. Default-off ability categories (`bricks-permissions`, `bricks/execute-php`, code execution) stay off unless Kaden says yes in Blocked.
7. Never write the database, post meta or options directly, and never use `wp eval` to change content (setup, export and `wp acss` are the only WP-CLI writes). If an ability is missing or refuses, record it in `pm/gaps.md` and ask.

## Version control and recovery

The site lives in MariaDB, which a sandbox rebuild wipes. At every phase end and before risky changes:

```bash
bash $S export <job-dir>     # site/exports/db.sql + uploads list; then commit
```

After a rebuild: `bash $S setup <job-dir> <port>` (reinstalls tools; keeps files) then `bash $S restore <job-dir>`.

Also export the design system with `bricks/export-transfer-package` into `site/exports/` at the end of the design phase; it becomes the starter for the next Bricks job (Kaden's B3 decision: the first Bricks job builds the reusable starter).

## Client editing (Kaden's clients edit in Bricks)

- Named, purposeful global classes (`bricks-naming-conventions`); no anonymous one-off styling.
- Structural templates (header, footer, archive, single) locked; clients edit page content only.
- `site/docs/editing-guide.md`: plain-language guide to editing text, images, and adding a page from a template.

## Handoff

Staging is the local site (screenshots for review). At job end:

```bash
bash $S package <job-dir>    # handoff/: db dump + wp-content zip
```

`package` saves a database dump and a `wp-content` zip as safety copies, turns the AI surface off (Bricks abilities, MCP Adapter and SchemaWP; re-enabled on the live site only where Brian runs it after launch), and installs WPVivid. Kaden then logs in to the local site himself (`http://localhost:<port>/wp-admin`, login in `site/.env.local`; he reaches the sandbox through a port forward Brian sets up) and makes the WPVivid export, which he restores on Cloudways. Before packaging: no test users, no test form entries, and `WP_ENVIRONMENT_TYPE` noted for Kaden to change on Cloudways.

## Screenshots

`bricks-browser-verify` and QA use the sandbox's headless Chromium:

```bash
CH=$(ls -d /opt/playwright/chromium_headless_shell-*/chrome-headless-shell-linux*/chrome-headless-shell | head -1)
$CH --no-sandbox --hide-scrollbars --window-size=1280,2000 --screenshot=page-1280.png http://localhost:<port>/<path>
$CH --no-sandbox --hide-scrollbars --window-size=390,2600 --screenshot=page-390.png http://localhost:<port>/<path>
```

## Pitfalls (from the Oct 2026 spike on Bricks 2.4.2)

- **"Lacks bricks_full_access" on every design ability:** the builder-capability step of setup did not run. Fix with setup, never by enabling permission abilities.
- **`bricks-commit-site-foundation` leaves element-level styles** (it set `font-size: 10px` on each section root and the header/footer containers). Strip them with `bricks/batch-update-elements` right after, and check with a readback.
- **The foundation call always creates its own homepage.** Don't create a draft Home first, or you end up trashing it.
- **Scale variables don't exist until the foundation commits,** so the first CSS uses literal values; plan a second pass to move spacing and type onto the variables (or onto ACSS's).
- **Global class writes are strictly serial** (each write changes the ownership digest the next needs). Batch where an ability allows it; otherwise budget the time.
- **Values with no scale stay literal** (radius, max-width, grid columns). With Automatic.css these should map to ACSS variables; flag any that remain in `qa`.
- The spike built a full foundation, header, footer and a three-section homepage in about 2 minutes for about $1.10 of usage.

## SchemaWP pitfalls (tested on 1.3.5)

- **Hex color patches are refused** when the palette has per-shade overrides (the default palette does). Prefer OKLCH keys (`primary-l-oklch`, `-c-`, `-h-`). If using hex, resubmit with `restore_shade_overrides_after` to keep the shades or `confirm_shade_reset: true` to reset them; decide which in `design.md`.
- **Unified brand lightness** (on by default) overrides the L value you send (sent 0.55, got 0.65). Turn it off first if exact lightness matters.
- After an OKLCH patch, `color-primary` (hex) is not updated; read colors back as OKLCH or from the generated CSS.
- `apply_kit` replaces the whole ACSS config (keys missing from the kit are removed). Only apply a kit saved on the same ACSS version, and save a "before" kit first.
- It also has post create/update/delete tools that can **publish**. Agents don't use them; content goes through Bricks and WordPress abilities.

## Never

Connect to Cloudways or any live site, activate license keys, install plugins outside the brief's stack, enable PHP execution, or leave the MCP surface on in the handoff package.
