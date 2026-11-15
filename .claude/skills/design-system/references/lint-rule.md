# No-raw-values lint

Goal: a build fails if page or component code contains a literal color, font size, or spacing value.

Approach (ESLint + a small custom rule, or stylelint for CSS):
- Flag string literals matching `#[0-9a-fA-F]{3,8}`, `rgb(`, `hsl(` outside `packages/tokens/`.
- Flag `fontSize`, `padding`, `margin`, `gap`, `width`, `height` set to a number or `\d+px` string outside the tokens and theme output.
- Tailwind: enable only the theme-generated scale; disable arbitrary values (`[...]`) via the plugin's config or a lint for `\[[^\]]+\]` in class strings.
- Allow-list: generated theme file, the tokens build script, third-party embeds.

Add it to `npm run lint` and to CI. QA runs it as a blocker.
