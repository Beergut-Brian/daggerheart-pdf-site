# Designer task: primary button hover (redesign pass 2, 2026-11-18)
J = /srv/ai-hub/jobs/daggerheart-site-2026-10-23. Work only in J/design/redesign/. No site/app or site/public edits, no commit, push, deploy or messages. No salt.

Kaden (verbatim): "I do like the button layout. Icon in a box on left, text on the right. On hover the icon box fills the box by sliding to the right."

Do:
- Restyle the system's primary button `.cta` (shared/base.css, tokens in shared/tokens.css): outlined button, filled square icon box on the LEFT, label right (already the layout). Hover AND :focus-visible: the icon box's fill expands to the right until it fills the whole button; the label inverts colour to stay readable on the light fill (icon stays visible). 250-350 ms ease-out, reverses on leave. Focus-visible also gets a visible focus ring (offset outline). `prefers-reduced-motion`: instant colour change, no slide.
- Implement it CSS-only on the existing markup (e.g. a ::before fill layer on `.cta` that starts at the icon square's size/position and grows to full width via transform or clip-path/inset; label and icon above it with z-index). Do NOT change the CTA's HTML structure: a parallel agent is copying home-a's markup into a new home-c board and must inherit your CSS unchanged. Keep `.cta--sm` working.
- Every primary CTA on home-a, home-b, resources (Open buttons) uses `.cta`; check viewer/index.html and viewer/phone.html for any primary action that should be one (do not invent new actions; if none, say so). Tokens only, no raw hex outside tokens.css.
- Recordings in renders/: `button-hover.webm` (Playwright recordVideo at 1440x900 on home-a: rest 1 s, mouse onto the button, hold 1 s, mouse off, then Tab focus to show the focus state). Playwright video writes webm itself; ffmpeg cannot decode PNG here. `button-hover.png`: three frames side by side (rest, mid ~50%, full) cropped to the button, composed in an HTML page and screenshotted (to freeze mid, set the transition with a paused animation or a negative delay / a `.is-mid` debug class only in the capture page, not in shared CSS).
- Re-render home-a, home-b, resources, viewer with `node tools/render.js home-a home-b resources viewer` and view the PNGs.
- Run `npx -y impeccable detect --json <board>` for home-a, home-b, resources, viewer; save to each board's detect.json.
- Write `GATE-button.md` (≤8 lines): what changed, timing/easing, reduced motion, focus ring, which buttons use it, anything left.
Do not edit GATE.md (the Leader merges). Do not touch home-c/ or home-d/ (two parallel agents build them).
Done test: hover/focus fill reaches full width and label is readable (check your mid and full frames), reduced-motion rule present, webm + png exist, renders refreshed, detect saved, GATE-button.md written.

Resume note (2026-11-18): an earlier run was stopped mid-task. Already present: the `.cta::before` clip-path fill in shared/base.css, renders/button-hover.webm, tools/button-capture.js. Check them against this task (view frames), fix what's off, then finish the rest (button-hover.png, re-renders, detect, GATE-button.md). Don't start over.
