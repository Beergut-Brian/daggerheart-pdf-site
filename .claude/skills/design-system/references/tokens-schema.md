# tokens.json schema

```json
{
  "meta": { "source": "figma|proposed", "version": 1 },
  "color": {
    "background": { "value": "#FFFFFF", "source": "Figma/Neutral/0" },
    "surface": {}, "text": {}, "text-muted": {}, "border": {},
    "primary": {}, "primary-contrast": {}, "accent": {},
    "success": {}, "warning": {}, "danger": {}
  },
  "font": {
    "family": { "sans": "...", "serif": "...", "mono": "..." },
    "size": { "xs": 12, "sm": 14, "md": 16, "lg": 18, "xl": 22, "2xl": 28, "3xl": 36, "4xl": 48 },
    "weight": { "regular": 400, "medium": 500, "bold": 700 },
    "lineHeight": { "tight": 1.2, "normal": 1.5, "loose": 1.7 }
  },
  "space": { "0": 0, "1": 4, "2": 8, "3": 12, "4": 16, "5": 24, "6": 32, "7": 48, "8": 64, "9": 96 },
  "radius": { "sm": 4, "md": 8, "lg": 16, "full": 9999 },
  "shadow": { "sm": "...", "md": "...", "lg": "..." },
  "breakpoint": { "sm": 640, "md": 768, "lg": 1024, "xl": 1280 }
}
```

Rules: every color has a role name, not a hue name (`primary`, not `blue`). Numbers are unitless pixels; the build script adds units. Every text/background pair used in the design must meet WCAG AA contrast (4.5:1 body, 3:1 large text); list the pairs checked in `design.md`.
