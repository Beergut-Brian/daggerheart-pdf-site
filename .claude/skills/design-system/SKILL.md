---
name: design-system
description: How to turn brand or Figma variables into a tokens file, generate the theme, and build shared components. Use on every new site before pages are built, on redesigns, and whenever anyone is about to hard-code a color, size, or spacing value. Also enforces the no-raw-values lint rule.
---

# design-system

The design system is applied once as tokens and components, then reused on every page. Page code never contains raw values.

> **WordPress + Bricks jobs:** tokens live in Automatic.css settings and Bricks global variables, colors and theme styles; shared components are Bricks components and global classes. Follow `wordpress-bricks` and the Bricks skills (`bricks-design-systems`, `bricks-seed-design-system`, `bricks-naming-conventions`) instead of sections 2 to 4 below. Section 1 (where values come from) still applies.

## 1. Tokens

Produce `packages/tokens/tokens.json` matching `references/tokens-schema.md`.

- From Figma: export variables (colors, type, spacing, radii) and map them to the schema. Keep Figma's names in a `source` field so changes can be traced.
- Without Figma: propose a system. Base spacing of 4px, a type scale with 6 to 8 steps, a color palette with roles (background, surface, text, text-muted, primary, primary-contrast, accent, border, success, warning, danger). Record it as a Decision.
- The tokens file is platform-neutral (plain JSON, no CSS) so a mobile app can read the same file later.

## 2. Theme generation

Generate the web theme from tokens: CSS custom properties on `:root`, a dark variant if the brief wants one, and the framework config (Tailwind theme, CSS modules, or styled-system) that reads from those properties. One script, `packages/tokens/build.ts`, regenerates everything. Never hand-edit the generated output.

## 3. Components

Build in this order: primitives (Button, Input, Select, Checkbox, Textarea, Link), layout (Container, Stack, Grid, Section), feedback (Toast, Modal, Alert, Spinner, Skeleton), then site-specific (ProductCard, Price, QuantityStepper, ServiceCard, DonationTierCard, EventCard, Testimonial, as the profile needs).

Each component has: all variants and sizes from the design, hover/focus/active/disabled states, keyboard support, and a usage note. Build from the Figma frame when one exists.

## 4. Lint rule

Add a lint rule that fails the build when page or component code contains a raw hex/rgb color, a pixel font size, or a raw spacing value outside the tokens package. See `references/lint-rule.md`. QA runs it.

## Done when

tokens.json validates; the theme builds from it with one command; every component in design.md exists with states; the lint passes on the whole repo.
