# tooling.md — hsg-daggerheart

Which tools and MCP servers were actually available on this run. Record real
tool names read from the server on connect; never assume them.

| Tool | Version / where | Checked (date) | Notes |
| --- | --- | --- | --- |
| Impeccable skill | profile skill `creative/impeccable` (version from SKILL.md) | | |
| Impeccable detector | `impeccable detect` (skill launcher) or `npx impeccable detect` | | exit 0 pass, 2 findings, 1 scan error |
| Preview server | `web-job/scripts/design-preview/server.py` on <host>:<port> | | boards + memo pages (`/m/<ID>/`) |
| Renderer | `web-job/scripts/design-preview/render.sh` (Leader image Chromium) | | |
| SchemaWP / Bricks MCP | `bricks` server in `site/.mcp.json` (staging only) | | list `schemawp_acss_*`, `bricks_*` seen |
| Stitch MCP | https://stitch.googleapis.com/mcp (stitch mode only) | | paste `tools/list` names here |
| Refero MCP (v2, Stage 1b) | https://api.refero.design/mcp via `web-job/scripts/refero.py` (Bearer `REFERO_TOKEN` in my profile) | | paste `refero.py tools` output below |
| Refero Skill | `site/.claude/skills/refero-design/` (pinned commit in its `SOURCE.md`) | | research method only; this pipeline's files and gates win |
| Refero budget | `refero.py budget --design <this folder>` | | 8,000 calls/month per user, stop at 6,400 |

## Refero tools (from `refero.py tools` on first connect)
<!-- Expected from the docs (Oct 2026): refero_search_site, refero_search_app, refero_search_styles,
     refero_get_style, refero_search_screens, refero_get_screen, refero_get_similar_screens,
     refero_get_screen_image, refero_search_flows, refero_get_flow. Replace with what the server lists. -->
-

## Notes
-
