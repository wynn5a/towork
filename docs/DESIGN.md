---
name: Towork — Data Buddy
description: A dense, calm, keyboard-first dark interface where AI is a first-class teammate.
colors:
  # surfaces — darkest → most elevated (page sits on base; panels on panel;
  # menus/overlays on elevated; text fields on input)
  surface-base: "#08090a"
  surface-canvas: "#0b0c0e"
  surface-panel: "#0f1011"
  surface-elevated: "#16171a"
  surface-input: "#191a1e"
  control: "#2c2d2e"
  control-hover: "#313236"
  selected: "#232427"
  tooltip: "#212226"
  # text ramp — neutral-cool, caps at #f7f8f8, never pure white
  text-primary: "#f7f8f8"
  text-secondary: "#9c9da7"
  text-tertiary: "#6b6d79"
  text-quaternary: "#4c4e5a"
  on-control: "#e3e4e7"
  # accent — user-tweakable Linear indigo. Always derive tints via color-mix.
  accent: "#6e79d6"
  # semantic
  green: "#3fb950"
  amber: "#d9a521"
  red: "#e5534b"
  blue: "#4f9be6"
  purple: "#a371e8"
  teal: "#2dd4bf"
  # data-type identity — one fixed hue per column type, reused everywhere
  type-int: "#4f9be6"
  type-text: "#3fb950"
  type-time: "#d9a521"
  type-bool: "#a371e8"
  type-json: "#e07a5f"
  type-uuid: "#2dd4bf"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.032em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.022em"
  subject:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.012em"
  ui:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-0.006em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  control:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  caption:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 500
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.06em"
  micro:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 500
rounded:
  inline: "4px"
  sm: "6px"
  base: "8px"
  overlay: "12px"
  pill: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "5px 12px"
    typography: "{typography.control}"
  button-secondary:
    backgroundColor: "{colors.control}"
    textColor: "{colors.on-control}"
    rounded: "{rounded.base}"
    padding: "6px 13px"
    typography: "{typography.control}"
  button-secondary-hover:
    backgroundColor: "{colors.control-hover}"
    textColor: "{colors.text-primary}"
  button-chip:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "5.5px 10px"
    typography: "{typography.control}"
  card:
    backgroundColor: "{colors.surface-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.base}"
  nav-item:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    padding: "7px 9px"
    typography: "{typography.ui}"
  nav-item-active:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.inline}"
    padding: "7px 9px"
    typography: "{typography.control}"
  pill:
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    typography: "{typography.caption}"
  kbd:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-secondary}"
    rounded: "4px"
    padding: "1.5px 5px"
    typography: "{typography.micro}"
  command-palette:
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.overlay}"
    width: "560px"
  tooltip:
    backgroundColor: "{colors.tooltip}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    typography: "{typography.body}"
---

# Design System: Towork — Data Buddy

> This file is the **machine-readable** layer (Stitch format) that AI agents and
> impeccable commands read before generating UI. The **canonical, human-facing
> reference** — with full component recipes, shadow values, and live demos — is
> [`ux/design-system/DESIGN-SYSTEM.md`](../ux/design-system/DESIGN-SYSTEM.md)
> (v1.3) plus `ux/design-system/tokens.css` / `tokens.json`. When the two ever
> disagree, the `ux/design-system/` source wins and this file should be
> re-derived from it. The shipping app links `src/styles/tokens.css`.

## 1. Overview: The Calm Database Client

Data Buddy is a dense, calm, **keyboard-first dark** interface in the Linear
lineage, built for a tool where the human and an AI teammate work the same data.
Its whole philosophy is **chrome recedes, data leads**: the interface is the
quietest thing on screen so todos, issues, and the activity log are the loudest.

Three load-bearing ideas:

- **Hierarchy comes from elevation, not weight.** Five stacked near-black
  surfaces (`base → canvas → panel → elevated → input`) and a four-step text
  ramp do the work that heavy borders and big type do elsewhere. Nothing on a
  working screen exceeds weight 600.
- **Color means something.** The UI is neutral by default. The indigo accent
  marks primary action, selection, and focus — nothing decorative. Semantic
  hues signal state; each data type owns a fixed hue reused everywhere (badges,
  values, syntax).
- **Two typefaces, strict split.** Inter for interface chrome; IBM Plex Mono for
  anything machine-shaped — values, ids, types, keys, kbd hints, code.

Working dimensions: topbar 44px · toolbar 38px · data row 34px (30/42 density
variants) · sidebar 256px · inspector 360px · command palette 560px · icon
button 28×28. Density is the point — keep spacing tight and rhythmic; vary it for
grouping, never pad for comfort.

Anti-references (from `PRODUCT.md`): cluttered enterprise PM chrome, generic SaaS
dashboards (hero-metric cards, gradient accents, tracked-uppercase eyebrows), and
chatbot-shaped AI UIs. The AI is a teammate acting on data, not a chat panel.

## 2. Colors: The Near-Black Ramp

Everything sits on a Linear-exact neutral near-black ramp. **Never pure black,
never pure white** — surfaces span `#08090a`–`#191a1e`; text caps at `#f7f8f8`.

**Surfaces (elevation by lightness).** `surface-base` (#08090a) is the app shell;
`surface-canvas` (#0b0c0e) is content wells and table headers; `surface-panel`
(#0f1011) is cards and the sidebar; `surface-elevated` (#16171a) is menus,
overlays, and kbd chips; `surface-input` (#191a1e) is text fields. Raised neutral
controls use `control` (#2c2d2e) → `control-hover` (#313236); selected
segments use `selected` (#232427).

**Text ramp (four steps).** `text-primary` #f7f8f8 (titles, values, focused
content) · `text-secondary` #9c9da7 (labels, nav, body) · `text-tertiary`
#6b6d79 (captions, metadata, placeholder) · `text-quaternary` #4c4e5a (disabled,
hints, NULL, row numbers).

**Borders are translucent white hairlines, never opaque gray lines:**
`--border-soft` `rgba(255,255,255,0.045)` (row dividers, inner seams) ·
`--border` `rgba(255,255,255,0.07)` (default) · `--border-strong`
`rgba(255,255,255,0.12)` (hover edges). Control/divider width is `0.5px`.

**Accent (user-tweakable).** `accent` #6e79d6 is the in-app Linear indigo. It is
tweakable at runtime, so **every accent tint must derive from it** via
`color-mix`/`rgba`, never a second hardcoded hex: `--accent-soft` = accent @ 16%
(selection fills, active palette item), `--accent-line` = accent @ 45% (focus
rings).

**Semantic & data-type.** Semantic hues — green (success/true/connected), amber
(warning/primary key), red (error/destructive), blue (info), purple, teal — and
the six fixed data-type hues (`type-int` blue, `type-text` green, `type-time`
amber, `type-bool` purple, `type-json` #e07a5f, `type-uuid` teal) are the *only*
sanctioned colors. **Do not introduce new hues.** Status/enum pills tint the hue
at 14% for fill with full-hue text and a 5px leading dot — hue never carries
meaning alone.

## 3. Typography

Inter for chrome, IBM Plex Mono for machine-shaped content; base size 14px,
global tracking `-0.006em`. Hierarchy is size + color ramp, not boldness — never
exceed weight 600, and never set mono above 600.

| Role | Spec | Used for |
|------|------|----------|
| display | 44–46px / 600 / -0.032em (gradient `#f7f8f8 → 62%`) | marketing/cover only — **not** on working screens |
| title | 22px / 600 / -0.022em | page titles |
| subject | 16px / 600 / -0.012em | panel & dialog titles |
| ui | 13.5px / 400–500 | default interface text |
| body | 13px / 400 / 1.55 lh | paragraphs |
| control | 12.5px / 500 | buttons, inputs, table cells |
| caption | 11.5px / 500 / `text-tertiary` | helper text, descriptions |
| label | 11px / 600 / +0.06em / **UPPERCASE / mono** / `text-tertiary` | section labels |
| micro | 10.5px / mono | kbd hints, type badges |

Rules: tabular numerals (`font-variant-numeric: tabular-nums`) on every numeric
column. Mono is reserved for machine-shaped content — int/uuid/time cell values,
type badges, SQL, kbd, ids — plus section labels and kbd; never for prose or nav.
Loaded Inter weights are 400/500/600/700, so stick to those.

## 4. Elevation

Elevation is carried by **surface lightness first, shadow second**. The page
itself stays flat near-black with only the faintest top lift
(`radial-gradient(...rgba(255,255,255,0.018)...)`); shadows are used sparingly
and never to decorate.

- `--shadow-card` `0 1px 2px rgba(0,0,0,0.25)` — resting cards and floating chips
  (the ceiling for any in-page element).
- `--shadow-raise` `inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.25)`
  — the signature "raised chip": a top sheen plus soft contact. Worn by selected
  tabs, segmented-control segments, secondary buttons, and the active nav row.
- `--shadow-pop` `0 16px 48px -12px rgba(0,0,0,0.65), 0 4px 12px -2px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.06)`
  — **overlays only**: menus, dialogs, the command palette, tooltips.

Rule: never put a shadow heavier than `--shadow-card` on an in-page element;
reserve `--shadow-pop` for things that float above the page. Borders carry edges
that shadows don't, via translucent-white hairlines.

## 5. Components

Frontmatter carries the Stitch-valid props (color, typography, rounded, padding,
size). **Shadows, borders, and focus rings don't fit Stitch's 8-prop component
schema** — read the full recipes (exact box-shadow stacks, hover transitions,
the checkbox stroke draw) in
[`ux/design-system/DESIGN-SYSTEM.md` → Component recipes](../ux/design-system/DESIGN-SYSTEM.md).

Radii: `inline` 4px (inline cell editors) · `sm` 6px (buttons, inputs, nav rows)
· `base` 8px (cards, panels) · `overlay` 12px (menus, dialogs, palette) · `pill`.

- **button-primary** — near-flat indigo: faint top-to-bottom darken, crisp top
  sheen, 1px contact shadow. Not a heavy gradient. Hover = `brightness(1.08)`.
- **button-secondary** — Linear's default submit button: `control` fill, an inset
  1px ring + brighter top highlight + soft contact, drawn with box-shadow (not a
  sub-pixel border) so the highlight stays crisp at any DPR.
- **button-chip** — transparent, hairline border, `text-secondary`; hover fills
  `--bg-hover` and steps text/border up. `.danger` recolors to red.
- **card** — `surface-panel` + a faint top-light gradient + hairline border +
  `--shadow-card`. Nested cards are never correct.
- **nav-item / nav-item-active** — idle row is `text-secondary` on transparent;
  the active row reads as a faintly raised chip (`surface-elevated` fill, inset
  hairline ring, `--shadow-raise`), with its leading icon switched to accent.
- **input / inline cell editor** — `surface-elevated` fill, no border, a `2px`
  accent outline; numeric/uuid fields switch to mono.
- **pill (status/enum)** — 14%-hue-tint fill, full-hue text, 5px leading dot.
- **kbd** — mono 10.5px, `surface-elevated`, hairline border, sheen.
- **command-palette (⌘K)** — 560px, `surface-elevated` + faint top sheen, 12px
  radius, `--border-strong`, `--shadow-pop`; active item gets `--accent-soft`
  fill, `text-primary`, accent icon.
- **tooltip** — flat `tooltip` (#212226) surface, 13px label, solid keycaps;
  shows after 400ms, fades in 120ms, no arrow.

Segmented / pill toggles are **trackless** (no container fill); the selected
option becomes a raised pill sharing the `--shadow-raise` treatment.

## 6. Do's and Don'ts

**Motion** (fast, quiet, functional — confirm an action or reveal structure, then
get out of the way): hover/press tint over 120ms `--ease`, no translate/scale on
hover; entrances `opacity` + `translateY(4px→0)` over 180ms `--ease-out`;
overlays add `scale(0.985→1)` over 240ms; toggles use `--ease-spring` for a faint
overshoot. Animate **only** `transform` and `opacity` — never height/width/top/
left. Loops (spinner, shimmer, live pulse) run only while pending/live and stop
the instant state resolves. Honor `prefers-reduced-motion: reduce` everywhere:
drop movement and loops, keep ~0.01ms fades so state changes stay legible.

**Do**
- Keep the accent tweakable — derive every accent tint from `--accent` via `color-mix`.
- Use translucent-white hairlines for every border.
- Use mono only for machine-shaped content (values, ids, types, kbd, code) plus section labels.
- Let elevation + the color ramp create hierarchy; give every primary action a visible kbd hint (⌘K reaches everything).
- Verify contrast against the WCAG 2.1 AA bar (≥4.5:1 body, ≥3:1 large) — especially `text-tertiary`/`text-quaternary` on dark surfaces.

**Don't**
- Don't hardcode accent tints or introduce new hues outside the semantic/data-type palette.
- Don't use opaque gray borders, pure black, or pure white.
- Don't exceed weight 600, or set chrome/nav in mono.
- Don't put shadows heavier than `--shadow-card` on in-page elements; reserve `--shadow-pop` for overlays.
- Don't reach for cards as the default container, ever nest them, or build SaaS hero-metric / identical-card-grid layouts.
- Don't bolt the AI onto a chat sidebar — it acts on the same data through the same surfaces, with every change logged and attributed.
