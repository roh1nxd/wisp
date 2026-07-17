---
name: frontend-design
description: Use for ANY task that touches visual design, layout, color, typography, spacing, or animation in this codebase — building new UI, redesigning existing UI, fixing visual bugs, adding components. This is the single source of truth for how this app looks. Never write a color, font size, or spacing value that isn't defined here.
---

# Frontend Design System — Wisp

This skill exists because past design changes broke the app repeatedly:
text became invisible against backgrounds, colors were applied ad-hoc per
component, and hardcoded hex values scattered across files made things
impossible to fix consistently. This document is the fix: one system,
enforced everywhere, no exceptions.

## The one non-negotiable rule

**Every color used anywhere in this app must be a CSS custom property
defined in `globals.css`. Never write a raw hex value, an inline color,
or a Tailwind arbitrary color value (`bg-[#...]`, `text-[#...]`) in any
component file.** If a color you need doesn't exist as a token yet, add
it to `globals.css` first, then reference it — don't invent one inline.

Before touching any UI code, read `globals.css` in full to see what
tokens currently exist. After making any change, grep the codebase for
hex patterns (`#[0-9A-Fa-f]{6}`) and justify every remaining match, or
fix it.

---

## 1. Color system

### How to build a dark-mode color system that never goes invisible

The failure mode to avoid: text or borders rendering at a similar
lightness to their background. The fix is to never pick colors by eye —
derive them from a fixed lightness ladder so contrast is guaranteed by
construction.

Define surfaces and text on a single lightness scale (measured in
perceived lightness, roughly HSL lightness %):

| Token | Lightness | Purpose |
|---|---|---|
| `--bg-page` | 6-8% | Page background, the darkest surface |
| `--bg-surface` | 10-12% | Cards, panels, raised containers |
| `--bg-elevated` | 14-16% | Hover states, popovers, the highest surface |
| `--border-default` | white @ 8-10% alpha | Default hairline borders |
| `--border-strong` | white @ 16-20% alpha | Emphasized borders, hover |
| `--text-muted` | 45-50% | The DARKEST any text is ever allowed to be |
| `--text-secondary` | 65-70% | Supporting text, descriptions |
| `--text-primary` | 92-96% | Headlines, primary body text |

**The enforceable rule: nothing darker than `--text-muted` ever renders
as text.** If you're tempted to make text "subtler" by darkening it
further, use size, weight, or spacing instead — never drop below the
muted floor. This single rule is what prevents the invisible-text bug
permanently.

### Accent color

Pick exactly ONE accent hue for the entire application. Do not mix
multiple accent colors (this app previously mixed violet, blue, and
purple across different components — that inconsistency is itself a
design bug, not just a taste issue).

```css
--accent: [one hue, mid-high saturation, ~55-65% lightness];
--accent-hover: [same hue, +8-10% lightness];
--accent-text-on: [near-black or near-white, whichever passes contrast
                    against --accent];
```

Use `--accent` ONLY for: primary CTA buttons, active/selected states,
focus rings, links, progress indicators. Never for decorative purposes,
never for more than one element type competing for attention on the same
screen.

### Semantic colors (separate from the accent)

Error, success, and warning states get their own fixed hues, independent
of the accent — these carry meaning and should never be confused with
the brand accent:

```css
--danger: [red, ~55% lightness];
--success: [green, ~55% lightness];
--warning: [amber, ~60% lightness];
```

### Contrast enforcement checklist

Before considering any color change complete, verify:
- [ ] Every text/background pairing meets WCAG AA (4.5:1 for body text,
      3:1 for large text ≥24px) — when in doubt, pick the lighter option
+- [ ] No text token used below `--text-muted`'s lightness floor
- [ ] Only one accent hue appears anywhere in the app
- [ ] Zero hardcoded hex values outside `globals.css` (grep to confirm)

---

## 2. Typography

- Two font families maximum: one for UI/body (a clean grotesk — Inter,
  Geist, or similar), one for display/headlines if it differs from body
  (can be the same family at higher weight)
- Type scale — use a consistent ratio, don't pick sizes arbitrarily:
  `12px → 14px → 16px → 20px → 24px → 32px → 40px → 56px`
- Two weights only in most UI: 400 (regular) and 500-600 (medium/
  semibold) for emphasis. Reserve 700+ (bold) for large display
  headlines only — overusing bold weight makes everything compete for
  attention
- Line height: 1.5-1.7 for body text, 1.1-1.2 for large headlines
- Sentence case for UI labels, buttons, and headings — not Title Case,
  not ALL CAPS (except intentional small eyebrow/label text, which may
  use uppercase with letter-spacing as a deliberate stylistic choice, in
  moderation)

---

## 3. Spacing & layout

- Use a consistent spacing scale, not arbitrary pixel values:
  `4px → 8px → 12px → 16px → 24px → 32px → 48px → 64px → 96px`
- Every padding, margin, and gap value should come from this scale
- Border radius: pick 2-3 values max for the whole app (e.g. `8px` for
  controls/buttons, `16px` for cards) — don't vary radius arbitrarily
  per component
- Borders: `1px solid var(--border-default)` as the default; never
  thicker than 2px except for deliberate accent emphasis (e.g. a
  featured pricing card)

---

## 4. Motion & animation

- Duration: 150-300ms for most UI transitions (hover, focus, small state
  changes). 300-500ms for larger entrance animations (page sections
  appearing). Never exceed 600ms for anything except a deliberate
  slow reveal.
- Easing: use an "ease-out" style curve for entrances (fast start, slow
  settle) — avoid linear easing, it reads as robotic
- Entrance animations: fade + small directional movement (8-16px), not
  large movements (avoid anything that slides in from off-screen by
  hundreds of pixels — it reads as janky, not premium)
- Stagger children by 60-100ms when animating a list/grid into view, not
  more (large staggers make the page feel slow to finish loading)
- Always respect `prefers-reduced-motion` — wrap animation logic so it
  degrades to an instant, no-motion state for users who have this OS
  setting enabled
- Hover states: subtle scale (1.01-1.03) or brightness/border change —
  never large scale jumps, never layout-shifting hover effects

---

## 5. Components

### Controls/Buttons
- One primary style (filled, `--accent` background) per screen/view —
  never two competing primary buttons visible at once
- Secondary actions use an outlined or ghost style (transparent bg,
  `--border-default` or `--border-strong` border)
- Consistent padding across all buttons of the same size tier
- Disabled state: reduce opacity to ~40-50% AND remove pointer cursor —
  don't rely on color alone to signal disabled

### Cards
- `--bg-surface` background, `1px solid var(--border-default)` border,
  consistent border-radius from the scale above
+- Hover state (if interactive): `--bg-elevated` background or
  `--border-strong` border, not both changing dramatically at once

### Forms/inputs
- Consistent height across all text inputs in the same context
- Focus state: visible ring or border color change using `--accent`,
  never remove focus indicators entirely (accessibility)
- Placeholder text uses `--text-muted`, never lighter/darker than that

---

## 6. The verification process (run this after any design change)

This is what was skipped before, causing repeated regressions. Do not
skip it:

1. **Grep for violations**: search for `#[0-9A-Fa-f]{6}` outside
   `globals.css`, search for `bg-\[#`, `text-\[#`, and any inline
   `style={{color:` or `style={{background:` using raw hex — every
   match must be justified (e.g. a third-party library requiring a
   literal hex string) or fixed
2. **Page-by-page walkthrough**: list every route/page in the app.
   For each one, confirm every text element is readable, every
   interactive element has a visible state, and no element is
   accidentally invisible against its background
3. **Component-by-component for shared components**: anything used
   across multiple pages (nav, buttons, cards) — verify once, applies
   everywhere
4. **Report before declaring done**: list every file touched and what
   token/value was used — a change that can't be traced to a specific
   token in `globals.css` is not complete

## 7. Framework-specific rule for this Next.js app

Any component using event handlers (`onClick`, `onMouseEnter`,
`onMouseLeave`, etc.) MUST have `'use client'` as the first line of the
file. Before adding any hover/interactive effect to a component, check
whether that file currently has `'use client'` — if not, add it. This
is the exact class of bug that broke the site during the last design
pass (Server Components cannot receive function props), and it will keep
recurring on new components unless checked every time.