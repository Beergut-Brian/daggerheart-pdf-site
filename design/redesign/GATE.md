# Redesign gate: boards for Kaden (2026-11-17)

**Boards** (open from file://; all fonts and images are local):
- `home-a/index.html`: the reference structure. A floating light pill nav, Kaden's campfire as a full-bleed hero with the fire to the right, heavy left darkening and edges fading to near-black. Copy sits bottom-left at the reference's 15% line: tag pill, two-tone headline, one sub-line, outlined CTA with the book icon in a white square → Daggerheart Resources.
- `home-b/index.html`: the same parts on a centred vertical axis.
- `resources/index.html`: dark picker, same nav, faint campfire glow at the top, two-tone "Daggerheart / Resources" heading, the two real covers large with quiet title, subtitle, mono meta and an Open CTA. Below that, labelled sample states for 1 book and 6 books (the 6-book state uses 3 columns once there are 3+ books; 4 placeholders).
- `viewer/index.html` (1440): search open with 5 real hits and snippets, the Chapter Two outline open on "Full Example of Play", and page 135 as the brightest element. `viewer/phone.html` (390): reading view with the search sheet open over the page and the dock beneath.

**home-a vs home-b axis: composition.** A puts the copy in a left column with the fire off to the right, like the reference. B uses the smoke plume as a vertical spine: headline at the top of the plume, the fire in the middle, sub-line and CTA under it. **Recommendation: home-a.** It is the reference Kaden pointed at, the copy sits on calm dark canopy instead of smoke, and it holds up better on wide screens. B is more theatrical, and on phones the two are almost equal.

**Tagline (headline: dim line, then bright line). Pick first:**
1. "Rules, close at hand. / Stay by the fire." (on the boards)
2. "Rules, close at hand. / Pull up a seat."
3. "Rules, close at hand. / Keep the fire going."

**Copy not settled:**
- Sub-line "The Core Rulebook and Hope & Fear. Every page, searchable." is new. It only states facts, but Kaden should OK it or cut it.
- Tag "2 books · 601 pages" (397 + 204) has to be data-driven in the build.
- The 6-book state uses "Sample book" placeholders.

**Not matched to the reference, and why:**
- Its right-side round controls (bell, theme, language, avatar) are left out on home and resources because nothing real maps to them. The viewer's search field is the only control on the right.
- Nav links are limited to the real ones: Home, Daggerheart Resources | Core Rulebook, Hope & Fear. On phones the pill shows the wordmark and Daggerheart Resources.
- The reference photo is brighter, mid-tone grass. The campfire is a night shot, so the hero stays darker overall even after brightening it.
- The viewer bar is a dark bar rather than the light pill, so that the page stays the brightest thing on screen.
- The logo is a wordmark with a small "HSG" mono chip (from the live viewer), not a pictorial mark.

**Fonts:** Inter Tight 400/500/600 (OFL) for everything. It is a neo-grotesk with the reference headline's tight, round-shouldered feel at weight 500 and stays clean down to 13px UI. Geist Mono 400/500 (OFL) for the tag and meta. Both are self-hosted woff2 in `shared/fonts/`, licences included.

**Motion:** a few warm embers drift up the real plume on the home page. They are the reference's "subtle sparkle" made literal, and stay anchored to the fire in every crop. The canvas pauses offscreen and in hidden tabs; `prefers-reduced-motion` gets one still frame.

**Tokens:** `shared/tokens.css` is the only file with colour values, and the contrast table at its top covers every text/background pair. Page CSS uses variables only; a grep for raw hex outside tokens.css comes back empty.

**Detect (`<board>/detect.json`), all fixed except these, which are kept:**
- hero-eyebrow-chip (home-a, home-b, resources): the tag pill is a required part of the reference.
- overused-font (Geist Mono): it was one of the brief's three mono options and is the closest to the reference's tag.
- cramped-padding (resources): the covers and sample blanks are images meant to fill their frames edge to edge.
- repeated-container-text (viewer): the 15 "Hope" highlights are the search hits, which is the point.
