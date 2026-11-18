# Gate: primary button hover (pass 2, 2026-11-18)
- Changed: `.cta` in shared/base.css only (HTML unchanged). A `::before` fill layer starts clipped to the icon square (clip-path inset) and grows right to the full button on :hover and :focus-visible. The label turns `--color-cta-ink`, the border turns light, the icon stays visible. Once the slide ends, the button's own background switches to the light colour, so the label never sits on dark (detect's hover-contrast finding is now cleared).
- Timing: `--dur-fill` 300 ms, `--ease-out` cubic-bezier(0.2, 0.7, 0.2, 1). Reverses when the pointer leaves or focus moves away.
- Reduced motion: `prefers-reduced-motion: reduce` turns off all CTA transitions, so the colour changes at once with no slide (checked: 0 s).
- Focus: 2px `--color-ember` outline, 3px offset, plus the full fill.
- Used by: home-a and home-b hero CTA, resources Open buttons (`.cta--sm`, works). The viewer desktop and phone pages have no primary action: their controls are icon buttons, tabs and search. Nothing was added there.
- Left: the resources "1 book" sample state shows a non-interactive `span.cta` as a static picture, so it has no hover. Other detect findings (eyebrow chip, Geist Mono, cover padding, repeated "Hope") come from earlier work, not this change.
- Proof: renders/button-hover.webm, renders/button-hover.png (rest / mid / full), refreshed board renders, detect.json per board.
